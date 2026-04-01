let mockLogsBeforeSend: ((event: any) => boolean) | undefined

jest.mock("@datadog/browser-logs", () => ({
    datadogLogs: {
        logger: {
            info: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
        },
        setGlobalContext: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        init: jest.fn((config: any) => {
            mockLogsBeforeSend = config.beforeSend
        }),
    },
}))

let mockBeforeSend: ((event: any) => boolean) | undefined

jest.mock("@datadog/browser-rum", () => ({
    datadogRum: {
        init: jest.fn((config: any) => {
            mockBeforeSend = config.beforeSend
        }),
        setUser: jest.fn(),
        setGlobalContextProperty: jest.fn(),
        startDurationVital: jest.fn(),
        stopDurationVital: jest.fn(),
        addAction: jest.fn(),
        addError: jest.fn(),
        addTiming: jest.fn(),
    },
}))

jest.mock("../config/envconfig", () => ({
    ENVIRONMENT: "test",
    DATADOG_APPLICATION_ID: "test-application-id",
    DATADOG_CLIENT_TOKEN: "test-client-token",
}))

jest.mock("./logger", () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}))

jest.mock("@volley/platform-sdk/lib", () => ({
    getPlatform: jest.fn(() => "WEB"),
    Platform: {
        Web: "WEB",
        Mobile: "MOBILE",
        FireTV: "FIRE_TV",
    },
}))

jest.unmock("./datadog")

import "./datadog"

import { datadogLogs } from "@datadog/browser-logs"

import { addCustomContext, logUserAction, safeDatadogRum } from "./datadog"

describe("datadog logger wrapper", () => {
    let errorSpy: jest.SpyInstance
    let infoSpy: jest.SpyInstance

    beforeEach(() => {
        jest.clearAllMocks()
        errorSpy = jest.spyOn(datadogLogs.logger, "error")
        infoSpy = jest.spyOn(datadogLogs.logger, "info")
        delete (window as { __TEST_PLATFORM_OVERRIDES?: unknown })
            .__TEST_PLATFORM_OVERRIDES
    })

    afterEach(() => {
        delete (window as { __TEST_PLATFORM_OVERRIDES?: unknown })
            .__TEST_PLATFORM_OVERRIDES
    })

    describe("beforeSend callback", () => {
        it("should ignore errors from game-clients domain paths (not hub)", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://game-clients.volley.tv/some-game/index.js:123:45",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should ignore errors from game-clients-staging domain paths (not hub)", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://game-clients-staging.volley.tv/another-game/script.js:1:1",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should ignore errors from game-clients-dev domain paths (not hub)", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at http://game-clients-dev.volley.tv/test-game/main.js:456:789",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should NOT ignore errors from game-clients domain hub paths", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://game-clients.volley.tv/hub/main.js:123:45",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should NOT ignore errors from other domains", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://other-domain.com/some-game/index.js:123:45",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should NOT ignore errors without stack traces", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {},
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should handle errors with undefined error object", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: undefined,
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should NOT ignore non-error events", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "action",
                action: {
                    name: "click",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should handle edge case with complex stack traces", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: `Error: Test error
    at someFunction (https://game-clients.volley.tv/my-game/utils.js:45:12)
    at anotherFunction (https://game-clients.volley.tv/my-game/main.js:123:4)
    at Object.handleClick (https://other-domain.com/lib.js:789:1)`,
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out 'Fetch error HEAD' and log a warning (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()

            const loggerWarnSpy = jest.spyOn(require("./logger").logger, "warn")

            const event = {
                type: "error",
                error: {
                    message: "Fetch error HEAD - preconnect",
                    resource: { url: "https://example.com/ping" },
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
            expect(loggerWarnSpy).toHaveBeenCalledWith(
                "Filtering out Fetch error HEAD:",
                expect.objectContaining({
                    originalErrorMessage: "Fetch error HEAD - preconnect",
                    url: "https://example.com/ping",
                })
            )
        })

        it("should filter out 'Fetch error POST' to segment.io (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    message: "Fetch error POST https://api.segment.io/v1/t",
                    resource: { url: "https://api.segment.io/v1/t" },
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out Segment 'Failed to fetch' errors (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    message: "Failed to fetch",
                    resource: { url: "https://api.segment.io/v1/batch" },
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out Segment 'NetworkError when attempting to fetch resource' errors (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    message: "NetworkError when attempting to fetch resource.",
                    resource: { url: "https://api.segment.io/v1/batch" },
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out abort/platform unavailable errors (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()

            const messages = [
                "User aborted a request",
                "Aborted without reason",
                "Signal is aborted",
                "Java object is gone",
            ]

            for (const message of messages) {
                const event = {
                    type: "error",
                    error: { message },
                }
                const result = mockBeforeSend!(event)
                expect(result).toBe(false)
            }
        })

        it("should filter all errors when isFunctionalTest is true (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()
            ;(
                window as unknown as {
                    __TEST_PLATFORM_OVERRIDES: { isFunctionalTest: boolean }
                }
            ).__TEST_PLATFORM_OVERRIDES = { isFunctionalTest: true }

            const event = {
                type: "error",
                error: {
                    message: "Some real error that would normally be reported",
                    stack: "Error: something\n    at https://game-clients.volley.tv/hub/main.js:123:45",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should not filter errors when isFunctionalTest is false (RUM)", () => {
            expect(mockBeforeSend).toBeDefined()
            ;(
                window as unknown as {
                    __TEST_PLATFORM_OVERRIDES: { isFunctionalTest: boolean }
                }
            ).__TEST_PLATFORM_OVERRIDES = { isFunctionalTest: false }

            const event = {
                type: "error",
                error: {
                    message: "Some real error that should be reported",
                    stack: "Error: something\n    at https://game-clients.volley.tv/hub/main.js:123:45",
                },
            }

            const result = mockBeforeSend!(event)
            expect(result).toBe(true)
        })
    })

    describe("logs beforeSend callback", () => {
        it("should ignore errors from game-clients domain paths (not hub)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://game-clients.volley.tv/some-game/index.js:123:45",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should ignore errors from game-clients-staging domain paths (not hub)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://game-clients-staging.volley.tv/another-game/script.js:1:1",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should ignore errors from game-clients-dev domain paths (not hub)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at http://game-clients-dev.volley.tv/test-game/main.js:456:789",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should NOT ignore errors from game-clients domain hub paths", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://game-clients.volley.tv/hub/main.js:123:45",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should NOT ignore errors from other domains", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: "Error: something\n    at https://other-domain.com/some-game/index.js:123:45",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should NOT ignore errors without stack traces", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {},
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should handle errors with undefined error object", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: undefined,
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should NOT ignore non-error events", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "info",
                message: "Some info message",
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(true)
        })

        it("should handle edge case with complex stack traces", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    stack: `Error: Test error
    at someFunction (https://game-clients.volley.tv/my-game/utils.js:45:12)
    at anotherFunction (https://game-clients.volley.tv/my-game/main.js:123:4)
    at Object.handleClick (https://other-domain.com/lib.js:789:1)`,
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out 'Fetch error HEAD' and log a warning (Logs)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const loggerWarnSpy = jest.spyOn(require("./logger").logger, "warn")

            const event = {
                type: "error",
                error: { message: "Fetch error HEAD during preflight" },
                http: { url: "https://example.com/status" },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
            expect(loggerWarnSpy).toHaveBeenCalledWith(
                "Filtering out Fetch error HEAD:",
                expect.objectContaining({
                    originalErrorMessage: "Fetch error HEAD during preflight",
                    url: "https://example.com/status",
                })
            )
        })

        it("should filter out Segment 'Failed to fetch' errors (Logs)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: { message: "Failed to fetch" },
                http: { url: "https://api.segment.io/v1/batch" },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out Segment 'NetworkError when attempting to fetch resource' errors (Logs)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const event = {
                type: "error",
                error: {
                    message: "NetworkError when attempting to fetch resource.",
                },
                http: { url: "https://api.segment.io/v1/batch" },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should filter out abort/platform unavailable errors (Logs)", () => {
            expect(mockLogsBeforeSend).toBeDefined()

            const messages = [
                "User aborted a request",
                "Aborted without reason",
                "Signal is aborted",
                "Java object is gone",
            ]

            for (const message of messages) {
                const event = {
                    type: "error",
                    error: { message },
                }
                const result = mockLogsBeforeSend!(event)
                expect(result).toBe(false)
            }
        })

        it("should filter all errors when isFunctionalTest is true (Logs)", () => {
            expect(mockLogsBeforeSend).toBeDefined()
            ;(
                window as unknown as {
                    __TEST_PLATFORM_OVERRIDES: { isFunctionalTest: boolean }
                }
            ).__TEST_PLATFORM_OVERRIDES = { isFunctionalTest: true }

            const event = {
                type: "error",
                error: {
                    message: "Some real error that would normally be reported",
                    stack: "Error: something\n    at https://game-clients.volley.tv/hub/main.js:123:45",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(false)
        })

        it("should not filter errors when isFunctionalTest is false (Logs)", () => {
            expect(mockLogsBeforeSend).toBeDefined()
            ;(
                window as unknown as {
                    __TEST_PLATFORM_OVERRIDES: { isFunctionalTest: boolean }
                }
            ).__TEST_PLATFORM_OVERRIDES = { isFunctionalTest: false }

            const event = {
                type: "error",
                error: {
                    message: "Some real error that should be reported",
                    stack: "Error: something\n    at https://game-clients.volley.tv/hub/main.js:123:45",
                },
            }

            const result = mockLogsBeforeSend!(event)
            expect(result).toBe(true)
        })
    })

    describe("utility functions and logger override", () => {
        it("addCustomContext calls setGlobalContext", () => {
            const context = { user: "abc", session: "123" }

            addCustomContext(context)

            expect(datadogLogs.setGlobalContext).toHaveBeenCalledWith(context)
        })

        it("logger.error override sends to datadog with provided Error", () => {
            const { logger } = require("./logger")
            const err = new Error("boom")
            logger.error("test message", err, { extra: true })

            expect(errorSpy).toHaveBeenCalledWith(
                "test message",
                { additionalArgs: [{ extra: true }] },
                err
            )
        })

        it("logger.error override coerces string error to Error", () => {
            const { logger } = require("./logger")
            logger.error("msg", "string-error")
            const call = errorSpy.mock.calls[0]
            expect(call[0]).toBe("msg")
            expect(call[1]).toEqual({ additionalArgs: [] })
            expect(call[2]).toBeInstanceOf(Error)
            expect((call[2] as Error).message).toBe("string-error")
        })

        it("logger.error override omits error param when undefined", () => {
            const { logger } = require("./logger")
            logger.error("msg")
            expect(errorSpy).toHaveBeenLastCalledWith(
                "msg",
                { additionalArgs: [] },
                undefined
            )
        })

        it("logUserAction logs user action with proper format", () => {
            const action = "button_click"
            const context = { button: "submit", page: "home" }

            logUserAction(action, context)

            expect(infoSpy).toHaveBeenCalledWith("User action", {
                action,
                button: "submit",
                page: "home",
            })
        })

        it("logUserAction works without context", () => {
            const action = "page_view"

            logUserAction(action)

            expect(infoSpy).toHaveBeenCalledWith("User action", {
                action,
            })
        })
    })

    describe("safeDatadogRum", () => {
        beforeEach(() => {
            jest.clearAllMocks()
        })

        describe("startDurationVital", () => {
            it("should call datadogRum.startDurationVital and return result", () => {
                const mockVitalRef = { __dd_vital_reference: true as const }
                const startDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "startDurationVital"
                )
                startDurationVitalSpy.mockReturnValue(mockVitalRef)

                const result = safeDatadogRum.startDurationVital("test-vital")

                expect(startDurationVitalSpy).toHaveBeenCalledWith(
                    "test-vital",
                    undefined
                )
                expect(result).toBe(mockVitalRef)
            })

            it("should call datadogRum.startDurationVital with options", () => {
                const mockVitalRef = { __dd_vital_reference: true as const }
                const startDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "startDurationVital"
                )
                startDurationVitalSpy.mockReturnValue(mockVitalRef)

                const options = {
                    context: { test: "context" },
                    description: "test description",
                }
                const result = safeDatadogRum.startDurationVital(
                    "test-vital",
                    options
                )

                expect(startDurationVitalSpy).toHaveBeenCalledWith(
                    "test-vital",
                    options
                )
                expect(result).toBe(mockVitalRef)
            })

            it("should handle errors gracefully and return null", () => {
                const startDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "startDurationVital"
                )
                const loggerWarnSpy = jest.spyOn(
                    require("./logger").logger,
                    "warn"
                )

                const testError = new Error("Test error")
                startDurationVitalSpy.mockImplementation(() => {
                    throw testError
                })

                const result = safeDatadogRum.startDurationVital("test-vital")

                expect(result).toBe(null)
                expect(loggerWarnSpy).toHaveBeenCalledWith(
                    "Failed to start DataDog vital test-vital:",
                    testError
                )
            })
        })

        describe("stopDurationVital", () => {
            it("should call datadogRum.stopDurationVital with vital reference", () => {
                const mockVitalRef = { __dd_vital_reference: true as const }
                const stopDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "stopDurationVital"
                )

                safeDatadogRum.stopDurationVital(mockVitalRef)

                expect(stopDurationVitalSpy).toHaveBeenCalledWith(
                    mockVitalRef,
                    undefined
                )
            })

            it("should call datadogRum.stopDurationVital with string", () => {
                const stopDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "stopDurationVital"
                )

                safeDatadogRum.stopDurationVital("test-vital")

                expect(stopDurationVitalSpy).toHaveBeenCalledWith(
                    "test-vital",
                    undefined
                )
            })

            it("should call datadogRum.stopDurationVital with options", () => {
                const mockVitalRef = { __dd_vital_reference: true as const }
                const stopDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "stopDurationVital"
                )

                const options = { context: { test: "context" } }
                safeDatadogRum.stopDurationVital(mockVitalRef, options)

                expect(stopDurationVitalSpy).toHaveBeenCalledWith(
                    mockVitalRef,
                    options
                )
            })

            it("should not call datadogRum.stopDurationVital when vital is null", () => {
                const stopDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "stopDurationVital"
                )

                safeDatadogRum.stopDurationVital(null)

                expect(stopDurationVitalSpy).not.toHaveBeenCalled()
            })

            it("should handle errors gracefully", () => {
                const mockVitalRef = { __dd_vital_reference: true as const }
                const stopDurationVitalSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "stopDurationVital"
                )
                const loggerWarnSpy = jest.spyOn(
                    require("./logger").logger,
                    "warn"
                )

                const testError = new Error("Test error")
                stopDurationVitalSpy.mockImplementation(() => {
                    throw testError
                })

                expect(() => {
                    safeDatadogRum.stopDurationVital(mockVitalRef)
                }).not.toThrow()

                expect(loggerWarnSpy).toHaveBeenCalledWith(
                    "Failed to stop DataDog vital:",
                    testError
                )
            })
        })

        describe("addAction", () => {
            it("should call datadogRum.addAction with name only", () => {
                const addActionSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addAction"
                )

                safeDatadogRum.addAction("test-action")

                expect(addActionSpy).toHaveBeenCalledWith(
                    "test-action",
                    undefined
                )
            })

            it("should call datadogRum.addAction with name and context", () => {
                const addActionSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addAction"
                )

                const context = { button: "submit", page: "home" }
                safeDatadogRum.addAction("test-action", context)

                expect(addActionSpy).toHaveBeenCalledWith(
                    "test-action",
                    context
                )
            })

            it("should handle errors gracefully", () => {
                const addActionSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addAction"
                )
                const loggerWarnSpy = jest.spyOn(
                    require("./logger").logger,
                    "warn"
                )

                const testError = new Error("Test error")
                addActionSpy.mockImplementation(() => {
                    throw testError
                })

                expect(() => {
                    safeDatadogRum.addAction("test-action")
                }).not.toThrow()

                expect(loggerWarnSpy).toHaveBeenCalledWith(
                    "Failed to add DataDog action test-action:",
                    testError
                )
            })
        })

        describe("addError", () => {
            it("should call datadogRum.addError with error only", () => {
                const addErrorSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addError"
                )

                const testError = new Error("Test error")
                safeDatadogRum.addError(testError)

                expect(addErrorSpy).toHaveBeenCalledWith(testError, undefined)
            })

            it("should call datadogRum.addError with error and context", () => {
                const addErrorSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addError"
                )

                const testError = new Error("Test error")
                const context = { source: "api", status: 500 }
                safeDatadogRum.addError(testError, context)

                expect(addErrorSpy).toHaveBeenCalledWith(testError, context)
            })

            it("should handle errors gracefully", () => {
                const addErrorSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addError"
                )
                const loggerWarnSpy = jest.spyOn(
                    require("./logger").logger,
                    "warn"
                )

                const testError = new Error("Test error")
                const wrapperError = new Error("Wrapper error")
                addErrorSpy.mockImplementation(() => {
                    throw wrapperError
                })

                expect(() => {
                    safeDatadogRum.addError(testError)
                }).not.toThrow()

                expect(loggerWarnSpy).toHaveBeenCalledWith(
                    "Failed to add DataDog error:",
                    wrapperError
                )
            })
        })

        describe("addTiming", () => {
            it("should call datadogRum.addTiming with name only", () => {
                const addTimingSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addTiming"
                )

                safeDatadogRum.addTiming("test-timing")

                expect(addTimingSpy).toHaveBeenCalledWith(
                    "test-timing",
                    undefined
                )
            })

            it("should call datadogRum.addTiming with name and time", () => {
                const addTimingSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addTiming"
                )

                safeDatadogRum.addTiming("test-timing", 1234)

                expect(addTimingSpy).toHaveBeenCalledWith("test-timing", 1234)
            })

            it("should handle errors gracefully", () => {
                const addTimingSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "addTiming"
                )
                const loggerWarnSpy = jest.spyOn(
                    require("./logger").logger,
                    "warn"
                )

                const testError = new Error("Test error")
                addTimingSpy.mockImplementation(() => {
                    throw testError
                })

                expect(() => {
                    safeDatadogRum.addTiming("test-timing")
                }).not.toThrow()

                expect(loggerWarnSpy).toHaveBeenCalledWith(
                    "Failed to add DataDog timing test-timing:",
                    testError
                )
            })
        })

        describe("setUser", () => {
            it("should call datadogRum.setUser with user object", () => {
                const setUserSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "setUser"
                )

                const user = { id: "test-user-123" }
                safeDatadogRum.setUser(user)

                expect(setUserSpy).toHaveBeenCalledWith(user)
            })

            it("should handle errors gracefully", () => {
                const setUserSpy = jest.spyOn(
                    require("@datadog/browser-rum").datadogRum,
                    "setUser"
                )
                const loggerWarnSpy = jest.spyOn(
                    require("./logger").logger,
                    "warn"
                )

                const testError = new Error("Test error")
                setUserSpy.mockImplementation(() => {
                    throw testError
                })

                const user = { id: "test-user-123" }
                expect(() => {
                    safeDatadogRum.setUser(user)
                }).not.toThrow()

                expect(loggerWarnSpy).toHaveBeenCalledWith(
                    "Failed to set DataDog user:",
                    testError
                )
            })
        })
    })
})
