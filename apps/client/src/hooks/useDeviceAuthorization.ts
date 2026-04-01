import type { AuthStatus } from "@volley/platform-sdk/lib"
import { useAccount, useAuth } from "@volley/platform-sdk/react"
import { useCallback, useEffect, useRef, useState } from "react"

import { safeDatadogRum } from "../utils/datadog"
import { logger } from "../utils/logger"
import { useAnonymousId } from "./useAnonymousId"

export interface DeviceAuthorizationData {
    deviceCode: string
    userCode: string
    verificationUri: string
    verificationUriComplete: string
    expiresIn: number
    interval: number
}

interface UseDeviceAuthorizationResult {
    data: DeviceAuthorizationData | null
    isLoading: boolean
    error: string | null
    authStatus: AuthStatus | null
    setConnectionId: (connectionId: string) => void
    retry: () => void
}

export const DEFAULT_EXPIRES_IN = 60000
export const DEFAULT_INTERVAL = 5000

/**
 * Hook for managing device authorization flow.
 * Fetches a user code from the identity API that can be displayed on TV
 * and used for pairing mobile devices. Persists codes until they expire.
 *
 * Returns device authorization data, loading state, error, expiration status, and auth status.
 */
export const useDeviceAuthorization = (
    sessionId?: string,
    enabled: boolean = true
): UseDeviceAuthorizationResult => {
    const [data, setData] = useState<DeviceAuthorizationData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [connectionId, setConnectionId] = useState<string | null>(null)
    const [retryCounter, setRetryCounter] = useState(0)
    const retryActiveRef = useRef(false)
    const isLoadingRef = useRef(false)
    const deviceAuthVitalRef = useRef<ReturnType<
        typeof safeDatadogRum.startDurationVital
    > | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)
    const { authStatus, loginWithQR } = useAuth()
    const anonymousId = useAnonymousId()
    const { account } = useAccount()

    const fetchDeviceAuthorization = useCallback(
        async (connectionId: string): Promise<void> => {
            if (isLoadingRef.current) {
                return
            }

            const controller = new AbortController()
            abortControllerRef.current = controller

            try {
                isLoadingRef.current = true
                setIsLoading(true)
                setError(null)

                deviceAuthVitalRef.current = safeDatadogRum.startDurationVital(
                    "web_checkout_device_auth",
                    {
                        context: {
                            scope: "web_checkout",
                        },
                    }
                )
                safeDatadogRum.addAction("web_checkout_device_auth_started", {
                    scope: "web_checkout",
                })
                safeDatadogRum.addTiming("web_checkout_device_auth_started")

                logger.info("[Device Auth] Requesting device authorization", {
                    hasSessionId: !!sessionId,
                    sessionId,
                    hasAnonymousId: !!anonymousId,
                    hasConnectionId: !!connectionId,
                    connectionId,
                    authenticated: authStatus?.authenticated,
                    authInProgress: authStatus?.authInProgress,
                })

                const response = await loginWithQR({
                    sessionId,
                    anonymousId: authStatus?.authenticated
                        ? undefined
                        : anonymousId,
                    connectionId,
                    cancellation: controller.signal,
                })

                if (
                    !response.deviceCode ||
                    !response.userCode ||
                    !response.verificationUri
                ) {
                    throw new Error(
                        "Invalid response in useDeviceAuthorization: missing required fields"
                    )
                }

                logger.info("[Device Auth] Device authorization response", {
                    deviceCode: response.deviceCode,
                    userCode: response.userCode,
                    verificationUri: response.verificationUri,
                    verificationUriComplete: response.verificationUriComplete,
                    expiresIn: response.expiresIn || DEFAULT_EXPIRES_IN,
                    interval: response.interval,
                })

                if (response.expiresIn === undefined) {
                    response.expiresIn = DEFAULT_EXPIRES_IN
                }

                if (response.interval === undefined) {
                    response.interval = DEFAULT_INTERVAL
                }

                if (response.verificationUriComplete === undefined) {
                    response.verificationUriComplete = response.verificationUri
                }

                logger.info("[Device Auth] Device authorization successful", {
                    userCode: response.userCode,
                    verificationUri: response.verificationUri,
                    expiresIn: response.expiresIn,
                })

                if (deviceAuthVitalRef.current) {
                    safeDatadogRum.addAction("web_checkout_device_auth_ready", {
                        scope: "web_checkout",
                    })
                    safeDatadogRum.addTiming("web_checkout_device_auth_ready")
                    safeDatadogRum.stopDurationVital(
                        deviceAuthVitalRef.current,
                        {
                            context: {
                                scope: "web_checkout",
                                status: "success",
                            },
                        }
                    )
                    deviceAuthVitalRef.current = null
                }

                setData(response)
                retryActiveRef.current = false
            } catch (err) {
                if (err instanceof Error && err.name === "AbortError") {
                    logger.info("[Device Auth] Aborted")
                    return
                }

                logger.error(
                    "[Device Auth] Failed to get device authorization",
                    err,
                    {
                        errorType: typeof err,
                        isErrorInstance: err instanceof Error,
                        errorName: err instanceof Error ? err.name : undefined,
                        errorString: String(err),
                        errorKeys:
                            err && typeof err === "object"
                                ? Object.keys(err)
                                : [],
                        errorStack:
                            err instanceof Error ? err.stack : undefined,
                    }
                )

                if (deviceAuthVitalRef.current) {
                    safeDatadogRum.stopDurationVital(
                        deviceAuthVitalRef.current,
                        {
                            context: {
                                scope: "web_checkout",
                                status: "error",
                            },
                        }
                    )
                    deviceAuthVitalRef.current = null
                }

                const errorMessage =
                    err instanceof Error
                        ? err.message
                        : "Unknown error occurred"
                const errorContext = {
                    scope: "web_checkout",
                    errorMessage,
                    errorType: typeof err,
                    isErrorInstance: err instanceof Error,
                    errorName: err instanceof Error ? err.name : undefined,
                    hasSessionId: !!sessionId,
                    hasAnonymousId: !!anonymousId,
                    hasConnectionId: !!connectionId,
                    authenticated: authStatus?.authenticated,
                }
                safeDatadogRum.addAction(
                    "web_checkout_device_auth_failed",
                    errorContext
                )
                safeDatadogRum.addTiming("web_checkout_device_auth_failed")

                setError(errorMessage)
                setData(null)
                if (abortControllerRef.current) {
                    abortControllerRef.current.abort()
                }
            } finally {
                if (abortControllerRef.current === controller) {
                    isLoadingRef.current = false
                    setIsLoading(false)
                }
            }
        },
        [loginWithQR, sessionId, anonymousId, authStatus?.authenticated]
    )

    useEffect(() => {
        logger.info("[Device Auth] Effect running", {
            enabled,
            authenticated: authStatus?.authenticated,
            isSubscribed: account?.isSubscribed,
            authInProgress: authStatus?.authInProgress,
            hasConnectionId: !!connectionId,
            isLoadingRef: isLoadingRef.current,
            retryCounter,
        })

        if (!enabled) {
            logger.info("[Device Auth] Effect early return: not enabled")
            isLoadingRef.current = false
            retryActiveRef.current = false
            setIsLoading(false)
            setError(null)
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            return
        }

        if (authStatus?.authenticated && account?.isSubscribed) {
            logger.info(
                "[Device Auth] Effect early return: authenticated + subscribed"
            )
            isLoadingRef.current = false
            retryActiveRef.current = false
            setIsLoading(false)
            setError(null)
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
            return
        }

        if (authStatus?.authInProgress) {
            if (retryActiveRef.current) {
                logger.info(
                    "[Device Auth] authInProgress but retry active — bypassing guard",
                    { retryCounter }
                )
            } else {
                logger.info("[Device Auth] Effect early return: authInProgress")
                return
            }
        }

        if (!connectionId) {
            logger.info("[Device Auth] Effect early return: no connectionId")
            return
        }

        logger.info("[Device Auth] Effect proceeding to fetch", {
            connectionId,
            retryCounter,
        })
        void fetchDeviceAuthorization(connectionId)
    }, [
        enabled,
        authStatus?.authenticated,
        account?.isSubscribed,
        authStatus?.authInProgress,
        connectionId,
        fetchDeviceAuthorization,
        retryCounter,
    ])

    useEffect((): (() => void) => {
        return () => {
            if (deviceAuthVitalRef.current) {
                safeDatadogRum.stopDurationVital(deviceAuthVitalRef.current, {
                    context: {
                        scope: "web_checkout",
                        reason: "unmount",
                    },
                })
                deviceAuthVitalRef.current = null
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    const retry = useCallback((): void => {
        logger.info(
            "[Device Auth] Retry requested — aborting current request and re-fetching"
        )
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        isLoadingRef.current = false
        retryActiveRef.current = true
        setIsLoading(false)
        setError(null)
        setData(null)
        setRetryCounter((c) => c + 1)
    }, [])

    const handleSetConnectionId = (newConnectionId: string): void => {
        logger.info("[Device Auth] Setting connection ID", {
            connectionId: newConnectionId,
        })
        setConnectionId(newConnectionId)
    }

    return {
        data,
        isLoading,
        error,
        authStatus,
        setConnectionId: handleSetConnectionId,
        retry,
    }
}
