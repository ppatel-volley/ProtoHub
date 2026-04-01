import type * as errorUtils from "./errorUtils"
const { coerceToError } = jest.requireActual<typeof errorUtils>("./errorUtils")

describe("coerceToError", () => {
    describe("basic type handling", () => {
        it("returns the same Error", () => {
            const e = new Error("boom")
            const result = coerceToError(e)
            expect(result).toBe(e)
            expect(result.message).toBe("boom")
        })

        it("coerces string to Error", () => {
            const result = coerceToError("oops")
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("oops")
        })

        it("coerces number to Error", () => {
            const result = coerceToError(404)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("404")
        })

        it("coerces boolean to Error", () => {
            const result = coerceToError(false)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("false")
        })

        it("coerces null to Error with message 'null'", () => {
            const result = coerceToError(null)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("null")
        })

        it("coerces undefined to Error with message 'undefined'", () => {
            const result = coerceToError(undefined)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("undefined")
        })
    })

    describe("error-shaped object handling", () => {
        it("coerces error-shaped object preserving message/name/stack", () => {
            const shaped = { message: "bad", name: "TypeError", stack: "s" }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("bad")
            expect(result.name).toBe("TypeError")
            expect(result.stack).toBe("s")
        })

        it("sets cause when present and string", () => {
            const shaped = { message: "bad", cause: "root-cause" }
            const result = coerceToError(shaped)
            expect(result.cause).toBe("root-cause")
        })

        it("extracts message from 'msg' property", () => {
            const shaped = { msg: "custom message" }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("custom message")
        })

        it("extracts message from 'error' property", () => {
            const shaped = { error: "something failed" }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("something failed")
        })

        it("extracts message from 'reason' property", () => {
            const shaped = { reason: "connection refused" }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("connection refused")
        })

        it("prefers message over other keys", () => {
            const shaped = {
                message: "primary",
                msg: "secondary",
                error: "tertiary",
            }
            const result = coerceToError(shaped)
            expect(result.message).toBe("primary")
        })

        it("ignores empty string message and uses next available", () => {
            const shaped = { message: "", msg: "fallback" }
            const result = coerceToError(shaped)
            expect(result.message).toBe("fallback")
        })

        it("ignores whitespace-only message and uses next available", () => {
            const shaped = { message: "   ", msg: "fallback" }
            const result = coerceToError(shaped)
            expect(result.message).toBe("fallback")
        })

        it("handles numeric message properties", () => {
            const shaped = { message: 500 }
            const result = coerceToError(shaped)
            expect(result.message).toBe("500")
        })
    })

    describe("errors array handling", () => {
        it("extracts message from 'errors' array with string", () => {
            const shaped = { errors: ["first error", "second error"] }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("first error")
        })

        it("extracts message from nested object in 'errors' array", () => {
            const shaped = { errors: [{ message: "nested error" }] }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("nested error")
        })
    })

    describe("fallback for objects without message properties", () => {
        it("uses generic message for objects without extractable messages", () => {
            const shaped = { foo: "bar", baz: 123 }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("An error occurred")
        })

        it("includes name in fallback message when present", () => {
            const shaped = { name: "CustomError", foo: "bar" }
            const result = coerceToError(shaped)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("An error occurred: CustomError")
            expect(result.name).toBe("CustomError")
        })

        it("preserves original object in cause for debugging", () => {
            const shaped = { foo: "bar", baz: 123 }
            const result = coerceToError(shaped)
            expect(result.cause).toBe(shaped)
        })

        it("uses generic message for objects with many properties", () => {
            const shaped = { a: 1, b: 2, c: 3, d: 4, e: 5, f: 6, g: 7 }
            const result = coerceToError(shaped)
            expect(result.message).toBe("An error occurred")
        })

        it("handles empty object", () => {
            const result = coerceToError({})
            expect(result.message).toBe("An error occurred")
        })

        it("handles circular references gracefully", () => {
            const circular: Record<string, unknown> = { a: 1 }
            circular.self = circular
            const result = coerceToError(circular)
            expect(result).toBeInstanceOf(Error)
            expect(result.message).toBe("An error occurred")
            expect(result.cause).toBe(circular)
        })
    })

    describe("real-world error scenarios from codebase", () => {
        describe("Platform SDK errors (usePlatformStatus)", () => {
            it("handles platform error with originalError containing Error", () => {
                const platformError = {
                    message: "Platform connection failed",
                    originalError: new Error("WebSocket connection timeout"),
                }
                const result = coerceToError(platformError)
                expect(result.message).toBe("Platform connection failed")
            })

            it("handles platform error with originalError as plain object", () => {
                const platformError = {
                    message: "Platform initialization failed",
                    originalError: {
                        code: "INIT_TIMEOUT",
                        details: "Ready event not received within 30s",
                    },
                }
                const result = coerceToError(platformError)
                expect(result.message).toBe("Platform initialization failed")
            })

            it("handles platform originalError when passed directly", () => {
                const originalError = {
                    code: "PLATFORM_UNAVAILABLE",
                    statusText: "Service Unavailable",
                }
                const result = coerceToError(originalError)
                expect(result.message).toBe("Service Unavailable")
            })
        })

        describe("Device Authorization errors (useDeviceAuthorization)", () => {
            it("handles fetch network error", () => {
                const networkError = new TypeError("Failed to fetch")
                const result = coerceToError(networkError)
                expect(result).toBe(networkError)
                expect(result.message).toBe("Failed to fetch")
            })

            it("handles AbortError", () => {
                const abortError = new DOMException(
                    "The operation was aborted",
                    "AbortError"
                )
                const result = coerceToError(abortError)
                expect(result).toBe(abortError)
                expect(result.name).toBe("AbortError")
            })

            it("handles non-Error thrown value (string)", () => {
                const result = coerceToError("Unknown error type")
                expect(result.message).toBe("Unknown error type")
            })

            it("handles API error response object", () => {
                const apiError = {
                    status: 401,
                    statusText: "Unauthorized",
                    message: "Invalid credentials",
                }
                const result = coerceToError(apiError)
                expect(result.message).toBe("Invalid credentials")
            })

            it("handles API error with only statusText", () => {
                const responseError = {
                    status: 503,
                    statusText: "Service Unavailable",
                    ok: false,
                }
                const result = coerceToError(responseError)
                expect(result.message).toBe("Service Unavailable")
            })
        })

        describe("Zod validation errors (ExperimentManager, useGames)", () => {
            it("handles Zod-like error with issues array", () => {
                const zodError = {
                    name: "ZodError",
                    issues: [
                        {
                            code: "invalid_type",
                            expected: "string",
                            received: "number",
                            path: ["payload", "gameId"],
                            message: "Expected string, received number",
                        },
                    ],
                    message:
                        'Validation error: Expected string, received number at "payload.gameId"',
                }
                const result = coerceToError(zodError)
                expect(result.message).toBe(
                    'Validation error: Expected string, received number at "payload.gameId"'
                )
                expect(result.name).toBe("ZodError")
            })

            it("handles Zod error without message but with issues", () => {
                const zodError = {
                    name: "ZodError",
                    errors: [
                        { message: "Invalid enum value" },
                        { message: "Required field missing" },
                    ],
                }
                const result = coerceToError(zodError)
                expect(result.message).toBe("Invalid enum value")
                expect(result.name).toBe("ZodError")
            })
        })

        describe("Amplitude Experiment SDK errors", () => {
            it("handles experiment fetch failure", () => {
                const amplitudeError = {
                    message: "Failed to fetch variants",
                    status: 500,
                }
                const result = coerceToError(amplitudeError)
                expect(result.message).toBe("Failed to fetch variants")
            })

            it("handles experiment SDK timeout", () => {
                const timeoutError = new Error("Request timeout")
                timeoutError.name = "TimeoutError"
                const result = coerceToError(timeoutError)
                expect(result.message).toBe("Request timeout")
                expect(result.name).toBe("TimeoutError")
            })
        })

        describe("Game Launcher diagnostic objects", () => {
            it("handles diagnostic object without extractable message", () => {
                const diagnostics = {
                    errorType: "AbortError",
                    errorMessage: "The user aborted a request",
                    isAbortError: true,
                    errorCategory: "userNavigation",
                    latencyMs: 150,
                    platform: "FIRE_TV",
                    userAgent: "Mozilla/5.0...",
                }
                const result = coerceToError(diagnostics)
                expect(result.message).toBe("An error occurred")
                expect(result.cause).toBe(diagnostics)
            })

            it("handles diagnostic object with nested error property", () => {
                const diagnostics = {
                    error: "Game launch failed: invalid URL",
                    errorCategory: "networkError",
                    latencyMs: 5000,
                }
                const result = coerceToError(diagnostics)
                expect(result.message).toBe("Game launch failed: invalid URL")
            })
        })

        describe("Axios/HTTP errors", () => {
            it("handles Axios error structure", () => {
                const axiosError = {
                    message: "Request failed with status code 500",
                    name: "AxiosError",
                    code: "ERR_BAD_RESPONSE",
                    response: {
                        status: 500,
                        statusText: "Internal Server Error",
                        data: { error: "Database connection failed" },
                    },
                }
                const result = coerceToError(axiosError)
                expect(result.message).toBe(
                    "Request failed with status code 500"
                )
                expect(result.name).toBe("AxiosError")
            })

            it("handles Axios network error (no response)", () => {
                const axiosNetworkError = {
                    message: "Network Error",
                    name: "AxiosError",
                    code: "ERR_NETWORK",
                }
                const result = coerceToError(axiosNetworkError)
                expect(result.message).toBe("Network Error")
            })
        })

        describe("Tracking SDK errors (useHubTracking)", () => {
            it("handles tracking SDK load failure", () => {
                const trackingError = new Error("Failed to load tracking SDK")
                const result = coerceToError(trackingError)
                expect(result.message).toBe("Failed to load tracking SDK")
            })

            it("handles Segment API error", () => {
                const segmentError = {
                    message: "Segment API rate limited",
                    code: "RATE_LIMIT_EXCEEDED",
                    retryAfter: 60,
                }
                const result = coerceToError(segmentError)
                expect(result.message).toBe("Segment API rate limited")
            })
        })

        describe("Image/Asset loading errors", () => {
            it("handles image load failure event", () => {
                const imageError = {
                    type: "error",
                    target: { src: "https://example.com/image.webp" },
                    message: "Failed to decode image",
                }
                const result = coerceToError(imageError)
                expect(result.message).toBe("Failed to decode image")
            })

            it("handles image error without message", () => {
                const imageError = {
                    type: "error",
                    src: "https://example.com/broken.avif",
                    status: "failed",
                }
                const result = coerceToError(imageError)
                expect(result.message).toBe("An error occurred")
                expect(result.cause).toBe(imageError)
            })
        })

        describe("QR code loading errors", () => {
            it("handles QR generation failure", () => {
                const qrError = new Error(
                    "QR Load failed after maximum retries"
                )
                const result = coerceToError(qrError)
                expect(result.message).toBe(
                    "QR Load failed after maximum retries"
                )
            })
        })

        describe("WebSocket/SSE connection errors", () => {
            it("handles WebSocket close event", () => {
                const wsError = {
                    code: 1006,
                    reason: "Connection closed abnormally",
                    wasClean: false,
                }
                const result = coerceToError(wsError)
                expect(result.message).toBe("Connection closed abnormally")
            })

            it("handles WebSocket error without reason", () => {
                const wsError = {
                    code: 1006,
                    wasClean: false,
                    type: "close",
                }
                const result = coerceToError(wsError)
                expect(result.message).toBe("An error occurred")
                expect(result.cause).toBe(wsError)
            })
        })

        describe("Focus restoration errors (useFocusRestoration)", () => {
            it("handles focus recovery failure", () => {
                const focusError = new Error("TV Focus Recovery failed")
                const result = coerceToError(focusError)
                expect(result.message).toBe("TV Focus Recovery failed")
            })
        })

        describe("Room code lookup errors (RoomCodeEntry)", () => {
            it("handles room code not found", () => {
                const roomError = {
                    status: 404,
                    statusText: "Not Found",
                    error: "Room code not found",
                }
                const result = coerceToError(roomError)
                expect(result.message).toBe("Room code not found")
            })

            it("handles invalid code map response", () => {
                const invalidResponse = {
                    unexpectedField: true,
                    data: null,
                }
                const result = coerceToError(invalidResponse)
                expect(result.message).toBe("An error occurred")
                expect(result.cause).toBe(invalidResponse)
            })
        })
    })
})
