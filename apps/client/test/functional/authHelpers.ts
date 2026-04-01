import type { APIRequestContext, BrowserContext } from "@playwright/test"
import { expect } from "@playwright/test"

const baseURLByStage: Record<string, string> = {
    local: "https://auth-dev.volley.tv",
    dev: "https://auth-dev.volley.tv",
    staging: "https://auth-staging.volley.tv",
}

interface AuthConfig {
    email: string
    password: string
    authFile: string
}

export async function authenticateUser(
    request: APIRequestContext,
    context: BrowserContext,
    config: AuthConfig
): Promise<void> {
    const stage = process.env.TEST_ENVIRONMENT ?? "local"
    const baseURL = baseURLByStage[stage]

    const response = await request.post(`${baseURL}/api/v1/auth/login`, {
        data: {
            email: config.email,
            password: config.password,
        },
        headers: {
            "Content-Type": "application/json",
        },
    })

    expect(response.ok()).toBeTruthy()

    const setCookieHeader = response.headers()["set-cookie"]
    const tokenValue = setCookieHeader?.match(
        /volley_auth_refresh=([^;]+)/
    )?.[1]

    if (!tokenValue) {
        throw new Error("Could not find volley_auth_refresh in response")
    }

    await context.addCookies([
        {
            name: "volley_auth_refresh",
            value: tokenValue,
            domain: ".volley.tv",
            path: "/",
            httpOnly: true,
            secure: true,
            sameSite: "None",
        },
    ])

    await context.storageState({ path: config.authFile })
}
