import { IDENTITY_API_BASE_URL } from "../apis/identity-api"
import { PAYMENT_SUCCESS_SESSION_KEY } from "../constants"
import { logger } from "./logger"

export const logoutAndReload = async (): Promise<void> => {
    try {
        logger.info("Initiating logout and reload...")

        try {
            sessionStorage.removeItem(PAYMENT_SUCCESS_SESSION_KEY)
            logger.info("Cleared payment session cache")
        } catch (storageError) {
            logger.warn(
                "Failed to clear session storage",
                storageError instanceof Error
                    ? {
                          error: storageError.message,
                          name: storageError.name,
                      }
                    : { error: String(storageError) }
            )
        }

        const logoutUrl = `${IDENTITY_API_BASE_URL}/api/v1/auth/web/logout`
        const response = await fetch(logoutUrl, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
        })

        if (response.status === 204 || response.ok) {
            logger.info("Logout successful, reloading application...")
            window.location.reload()
        } else {
            logger.error(
                `Logout failed with status ${response.status}, reloading anyway...`
            )
            window.location.reload()
        }
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        logger.error("Error during logout", err)
        logger.info("Reloading application despite error...")
        window.location.reload()
    }
}
