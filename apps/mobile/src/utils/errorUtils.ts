function getPossibleKeyValue(value: unknown, key: string): string | undefined {
    return typeof (value as { [key in string]?: unknown })[key] === "string"
        ? (value as { [key in string]: string })[key]
        : undefined
}

function extractMessageFromObject(obj: object): string | undefined {
    const messageKeys = ["message", "msg", "error", "statusText", "reason"]
    for (const key of messageKeys) {
        const val = (obj as Record<string, unknown>)[key]
        if (typeof val === "string" && val.trim()) return val
        if (typeof val === "number") return String(val)
    }

    const errorsVal = (obj as Record<string, unknown>)["errors"]
    if (Array.isArray(errorsVal) && errorsVal.length > 0) {
        const firstError: unknown = errorsVal[0]
        if (typeof firstError === "string") return firstError
        if (typeof firstError === "object" && firstError !== null) {
            const nested = extractMessageFromObject(firstError)
            if (nested) return nested
        }
    }

    return undefined
}

/**
 * Converts an unknown thrown value into a proper Error instance.
 * Helps us stay type-safe when logging errors of unknown shape.
 * Preserves useful fields when the input is an error-shaped object.
 * Attempts multiple strategies to extract a meaningful message.
 * @param value - The value to convert to an Error.
 * @returns An Error instance (never undefined).
 */
export function coerceToError(value: unknown): Error {
    if (value instanceof Error) return value
    if (typeof value === "string") return new Error(value)
    if (typeof value === "number" || typeof value === "boolean") {
        return new Error(String(value))
    }
    if (value === null) return new Error("null")
    if (value === undefined) return new Error("undefined")

    if (typeof value === "object") {
        const extractedMessage = extractMessageFromObject(value)
        const maybeName = getPossibleKeyValue(value, "name")
        const maybeStack = getPossibleKeyValue(value, "stack")
        const maybeCause = getPossibleKeyValue(value, "cause")

        const message =
            extractedMessage ||
            (maybeName
                ? `An error occurred: ${maybeName}`
                : "An error occurred")

        const err = new Error(message)
        if (maybeName) err.name = maybeName
        if (maybeStack) err.stack = maybeStack
        err.cause = maybeCause ?? value
        return err
    }

    if (typeof value === "symbol") {
        return new Error(value.toString())
    }

    if (typeof value === "function") {
        return new Error(`Function: ${value.name || "anonymous"}`)
    }

    return new Error("Unknown value type")
}
