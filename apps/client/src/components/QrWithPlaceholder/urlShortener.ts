import { PLATFORM_AUTH_API_URL } from "../../constants"

export const URL_SHORTENING_API = "https://vly.gg"
export const QR_CODE_API_BASE = PLATFORM_AUTH_API_URL

interface LengthenURLResult {
    url: string
}

/** Is the given URL a valid short URL */
export function isShortURL(url: string): boolean {
    try {
        return new URL(url).origin === new URL(URL_SHORTENING_API).origin
    } catch (_e) {
        return false
    }
}

/** Lengthen given short URL */
export async function lengthenURL(shortURL: string): Promise<string> {
    const slug = new URL(shortURL).pathname.slice(1)
    const params = new URLSearchParams({
        short_link: slug,
    })

    const response = await fetch(`${URL_SHORTENING_API}/lengthen?${params}`)
    if (!response.ok) {
        throw new Error(`Failed to lengthen URL: ${response.statusText}`)
    }

    const result = (await response.json()) as LengthenURLResult
    return `${URL_SHORTENING_API}/${result.url}`
}
