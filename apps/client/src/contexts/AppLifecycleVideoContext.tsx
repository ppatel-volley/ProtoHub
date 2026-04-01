import { AppLifecycleStateEnum } from "@volley/platform-sdk/lib"
import { useAppLifecycleState } from "@volley/platform-sdk/react"
import { createContext, type JSX, type ReactNode, useContext } from "react"

import { isFireTV } from "../config/platformDetection"

interface AppLifecycleVideoContextType {
    videosEnabled: boolean
}

const AppLifecycleVideoContext = createContext<AppLifecycleVideoContextType>({
    videosEnabled: true,
})

export const AppLifecycleVideoProvider = ({
    children,
}: {
    children: ReactNode
}): JSX.Element => {
    const lifecycleState = useAppLifecycleState()

    const videosEnabled = ((): boolean => {
        if (isFireTV()) {
            return lifecycleState?.state !== AppLifecycleStateEnum.HIDDEN
        }

        return true
    })()

    return (
        <AppLifecycleVideoContext.Provider value={{ videosEnabled }}>
            {children}
        </AppLifecycleVideoContext.Provider>
    )
}

export const useAppLifecycleVideo = (): AppLifecycleVideoContextType =>
    useContext(AppLifecycleVideoContext)
