import { http, HttpResponse } from "msw"
import { setupServer } from "msw/node"

export interface ExperimentVariant {
    value?: string
    payload?: unknown
}

export interface ExperimentMockConfig {
    [flagKey: string]: ExperimentVariant
}

let mockConfig: ExperimentMockConfig = {}

export const amplitudeHandlers = [
    http.get("https://api.lab.amplitude.com/sdk/v2/vardata", () => {
        const variants: Record<string, ExperimentVariant> = {}

        Object.entries(mockConfig).forEach(([flagKey, variant]) => {
            variants[flagKey] = variant
        })

        return HttpResponse.json(variants)
    }),

    http.post("https://api.lab.amplitude.com/sdk/v2/vardata", () => {
        const variants: Record<string, ExperimentVariant> = {}

        Object.entries(mockConfig).forEach(([flagKey, variant]) => {
            variants[flagKey] = variant
        })

        return HttpResponse.json(variants)
    }),

    http.get("https://api.lab.amplitude.com/v1/vardata", () => {
        const variants: Record<string, ExperimentVariant> = {}
        Object.entries(mockConfig).forEach(([flagKey, variant]) => {
            variants[flagKey] = variant
        })
        return HttpResponse.json(variants)
    }),

    http.post("https://api.lab.amplitude.com/v1/vardata", () => {
        const variants: Record<string, ExperimentVariant> = {}
        Object.entries(mockConfig).forEach(([flagKey, variant]) => {
            variants[flagKey] = variant
        })
        return HttpResponse.json(variants)
    }),
]

export const amplitudeServer = setupServer(...amplitudeHandlers)

export function setAmplitudeExperiments(config: ExperimentMockConfig): void {
    mockConfig = { ...config }
}

export function clearAmplitudeExperiments(): void {
    mockConfig = {}
}

export function getAmplitudeExperiments(): ExperimentMockConfig {
    return { ...mockConfig }
}
