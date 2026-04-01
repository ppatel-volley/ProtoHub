import type { PlatformSDKOptions } from "@volley/platform-sdk/lib"
import { PlatformProvider } from "@volley/platform-sdk/react"
import type { ReactNode } from "react"

import {
    type PlatformContextType,
    usePlatformContext,
} from "../../node_modules/@volley/platform-sdk/src/react/context/PlatformContext"

const defaultTestOptions: PlatformSDKOptions = {
    gameId: "test-game",
    appVersion: "1.0.0",
    stage: "production",
}

export function createTestWrapper(options?: Partial<PlatformSDKOptions>): {
    wrapper: ({ children }: { children: ReactNode }) => ReactNode
    getContext: () => PlatformContextType
} {
    let context: PlatformContextType

    const ContextCapture = ({
        children,
    }: {
        children: ReactNode
    }): ReactNode => {
        const ctx = usePlatformContext()

        context = ctx
        return children
    }

    const wrapper = ({ children }: { children: ReactNode }): ReactNode => (
        <PlatformProvider options={{ ...defaultTestOptions, ...options }}>
            <ContextCapture>{children}</ContextCapture>
        </PlatformProvider>
    )

    return {
        wrapper,
        getContext: () => context,
    }
}
