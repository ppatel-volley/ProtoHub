import { coerceToError } from "./errorUtils"

/** Singleton logger with optional remote endpoint for forwarding logs. */
class Logger {
    private static instance: Logger

    private loggerEndpoint?: string

    public setEndpoint(endpoint: string): void {
        this.loggerEndpoint = endpoint
        this.info("Logger endpoint set", { endpoint: this.loggerEndpoint })
    }

    public info(message: string, data?: object): void {
        this.sendLog("info", message, data)
    }

    public error(message: string, error?: unknown, data?: object): void {
        const normalizedError =
            error !== undefined ? coerceToError(error) : undefined
        this.sendLog("error", message, { error: normalizedError, data })
    }

    public warn(message: string, data?: object): void {
        this.sendLog("warn", message, data)
    }

    private constructor(loggerEndpoint?: string) {
        this.loggerEndpoint = loggerEndpoint
    }

    private sendLog(
        level: "log" | "info" | "warn" | "error" | "debug",
        msg: string,
        data?: object
    ): void {
        const logData = {
            level,
            msg,
            ...data,
        }

        if (data !== undefined) {
            console[level](`[${level}] ${msg}`, data)
        } else {
            console[level](`[${level}] ${msg}`)
        }

        if (this.loggerEndpoint) {
            const req = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(logData),
            }
            // Fire and forget the fetch request
            fetch(this.loggerEndpoint, req).catch((error) => {
                console.error(`Logging failed: ${error}`)
            })
        }
    }

    public static getInstance(loggerEndpoint?: string): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger(loggerEndpoint)
        }
        return Logger.instance
    }
}

/** Singleton logger instance for console and optional remote log forwarding. */
export const logger = Logger.getInstance()
