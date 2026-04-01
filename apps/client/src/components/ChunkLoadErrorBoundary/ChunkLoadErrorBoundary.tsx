import { useAppLifecycle, useSupport } from "@volley/platform-sdk/react"
import { Component, type ErrorInfo, type ReactNode } from "react"

import { SHOULD_FORCE_CHUNK_LOAD_ERROR } from "../../config/devOverrides"
import { useBranding } from "../../hooks/useBranding"
import { useCopy } from "../../hooks/useCopy"
import { safeDatadogRum } from "../../utils/datadog"
import { logger } from "../../utils/logger"
import { FailureModal } from "../UI/FailureModal"

interface ChunkLoadErrorBoundaryProps {
    children: ReactNode
}

interface ChunkLoadErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

const DevChunkErrorTrigger = (): null => {
    if (SHOULD_FORCE_CHUNK_LOAD_ERROR) {
        logger.info("Dev override: forcing chunk load error")
        throw new Error(
            "Failed to fetch dynamically imported module: https://game-clients.volley.tv/hub/assets/features-DEV_OVERRIDE.js"
        )
    }
    return null
}

const CHUNK_LOAD_ERROR_TITLE = "Hmm, something went wrong."

const isChunkLoadError = (error: Error): boolean => {
    const errorMessage = error.message.toLowerCase()
    const errorName = error.name.toLowerCase()

    return (
        errorMessage.includes("failed to fetch dynamically imported module") ||
        errorMessage.includes("loading chunk") ||
        errorMessage.includes("chunkloaderror") ||
        errorName.includes("chunkloaderror")
    )
}

class ChunkLoadErrorBoundaryClass extends Component<
    ChunkLoadErrorBoundaryProps,
    ChunkLoadErrorBoundaryState
> {
    constructor(props: ChunkLoadErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        if (isChunkLoadError(error)) {
            logger.error("Chunk load error caught by boundary:", error, {
                context: "chunk_load_error_boundary",
                errorType: "CHUNK_LOAD_ERROR",
                componentStack: errorInfo.componentStack,
            })

            safeDatadogRum.addAction("chunk_load_error_modal_displayed", {
                errorMessage: error.message,
            })
        }
    }

    public render(): ReactNode {
        if (this.state.hasError && this.state.error) {
            return <ChunkLoadErrorModalWrapper error={this.state.error} />
        }

        return (
            <>
                <DevChunkErrorTrigger />
                {this.props.children}
            </>
        )
    }

    public static getDerivedStateFromError(
        error: Error
    ): ChunkLoadErrorBoundaryState {
        if (isChunkLoadError(error)) {
            return { hasError: true, error }
        }
        throw error
    }
}

const ChunkLoadErrorModalWrapper = ({ error }: { error: Error }): ReactNode => {
    const { exitApp } = useAppLifecycle()
    const { weekendRebrandActive } = useBranding()
    const supportEmail = useSupport().getSupportEmail(weekendRebrandActive)
    const errorInstructions = useCopy("errorInstructions")

    const handleExit = (): void => {
        logger.info("User requested exit after chunk load error")
        safeDatadogRum.addAction("chunk_load_error_exit_requested")
        void exitApp()
    }

    return (
        <FailureModal
            isOpen
            onExit={handleExit}
            title={CHUNK_LOAD_ERROR_TITLE}
            instructions={errorInstructions}
            email={supportEmail}
            errorMessage={error.message}
            containerId="chunk-load-error-modal-container"
        />
    )
}

export const ChunkLoadErrorBoundary = ChunkLoadErrorBoundaryClass
