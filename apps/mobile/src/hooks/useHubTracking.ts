import { useTracking } from "@volley/platform-sdk/react"
import { useCallback, useMemo, useRef } from "react"

import { logger } from "../utils/logger"

type TrackingEventBuilder = new (
    schemaMap: unknown,
    options: { throwOnValidationError: boolean }
) => {
    build: (
        eventName: string,
        properties: Record<string, unknown>
    ) => {
        eventName: string
        properties: Record<string, unknown>
    }
}

let trackingLibPromise: Promise<{
    TrackingEventBuilder: TrackingEventBuilder
    HUB_EVENT_SCHEMA_MAP: unknown
}> | null = null

const getTrackingLib = async (): Promise<{
    TrackingEventBuilder: TrackingEventBuilder
    HUB_EVENT_SCHEMA_MAP: unknown
}> => {
    if (!trackingLibPromise) {
        trackingLibPromise = Promise.all([
            import("@volley/tracking/lib"),
            import("@volley/tracking/schemas"),
        ])
            .then(([lib, schemas]) => ({
                TrackingEventBuilder:
                    lib.TrackingEventBuilder as unknown as TrackingEventBuilder,
                HUB_EVENT_SCHEMA_MAP: schemas.HUB_EVENT_SCHEMA_MAP,
            }))
            .catch((error) => {
                trackingLibPromise = null
                logger.error("Failed to load tracking SDK", error)
                throw error
            })
    }
    return trackingLibPromise
}

/** Wraps platform tracking with schema validation via lazily-loaded TrackingEventBuilder. Events are validated before send; invalid events are dropped silently. */
export const useHubTracking = (): {
    track: <K extends string>(
        eventName: K,
        eventProperties: Record<string, unknown>,
        timestamp?: Date
    ) => void
    updateBaseEventProperties: (baseEventProperties: object) => void
} => {
    const tracking = useTracking()
    const { track } = tracking
    const eventBuilderRef = useRef<InstanceType<TrackingEventBuilder> | null>(
        null
    )

    const trackEvent = useCallback(
        <K extends string>(
            eventName: K,
            eventProperties: Record<string, unknown>,
            timestamp?: Date
        ): void => {
            const eventTimestamp = timestamp ?? new Date()

            void getTrackingLib().then(
                ({ TrackingEventBuilder: Builder, HUB_EVENT_SCHEMA_MAP }) => {
                    if (!eventBuilderRef.current) {
                        eventBuilderRef.current = new Builder(
                            HUB_EVENT_SCHEMA_MAP,
                            {
                                throwOnValidationError: false,
                            }
                        )
                    }
                    const event = eventBuilderRef.current.build(
                        eventName,
                        eventProperties
                    )
                    track(event.eventName, event.properties, {
                        timestamp: eventTimestamp,
                    })
                }
            )
        },
        [track]
    )

    const updateBaseEventProps = useCallback(
        (baseEventProperties: object): void => {
            tracking.updateBaseEventProperties(baseEventProperties)
        },
        [tracking]
    )

    return useMemo(
        () => ({
            track: trackEvent,
            updateBaseEventProperties: updateBaseEventProps,
        }),
        [trackEvent, updateBaseEventProps]
    )
}
