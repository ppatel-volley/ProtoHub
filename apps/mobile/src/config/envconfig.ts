import type { AppConfig } from "../types/globals"
import { Environment } from "./environment"

/**
 * Util to ensure type safety for env variables and provide optional default values
 */
export function getEnvVar(
    key: keyof ImportMetaEnv,
    defaultValue?: string
): string {
    const value: unknown = import.meta.env[key]
    return (typeof value === "string" ? value : defaultValue) ?? ""
}

/**
 * Util to ensure type safety for window variables and provide optional default values
 */
export const getWindowVar = (
    key: keyof AppConfig,
    defaultValue?: string
): string => {
    const value: unknown = window?.APP_CONFIG?.[key]
    return (typeof value === "string" ? value : defaultValue) ?? ""
}

export const getEnvironment = (defaultValue?: Environment): Environment => {
    const value = getWindowVar("environment", defaultValue ?? Environment.LOCAL)
    return value as Environment
}

export const LOGO_DISPLAY_MILLIS = parseInt(
    getEnvVar("VITE_VOLLEY_LOGO_DISPLAY_MILLIS", "2000")
)

export const AMPLITUDE_EXPERIMENT_KEY = getWindowVar(
    "AMPLITUDE_EXPERIMENT_KEY",
    ""
)

export const BACKEND_SERVER_ENDPOINT = getWindowVar(
    "BACKEND_SERVER_ENDPOINT",
    "http://localhost:3000"
)

export const SEGMENT_WRITE_KEY = getWindowVar(
    "SEGMENT_WRITE_KEY",
    "GplqCvL1EzLnZNpAHYGqObnDzrAtgoAS"
)

export const ENVIRONMENT = getEnvironment()

export const BASE_URL = getEnvVar("BASE_URL", "/")

export const EXPERIMENT_ASSETS_CDN_URL = getEnvVar(
    "VITE_EXPERIMENT_ASSETS_CDN_URL",
    "https://d2gjn6jl1mn1ku.cloudfront.net"
)

export const DATADOG_APPLICATION_ID = getWindowVar(
    "DATADOG_APPLICATION_ID",
    "64006289-3e44-4ff7-a53a-7a3b2c0f4dfa"
)

export const DATADOG_CLIENT_TOKEN = getWindowVar(
    "DATADOG_CLIENT_TOKEN",
    "pube482df09a4ecefe8814037941e7acaaa"
)

export const OVERRIDE_GAME_ORCHESTRATION = getEnvVar(
    "VITE_OVERRIDE_GAME_ORCHESTRATION",
    "false"
)
