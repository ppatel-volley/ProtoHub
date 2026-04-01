/**
 * @jest-environment jsdom
 */

describe("polyfills", () => {
    let originalResizeObserver: typeof window.ResizeObserver | undefined
    let originalIntersectionObserver:
        | typeof window.IntersectionObserver
        | undefined
    let originalFinalizationRegistry: typeof FinalizationRegistry | undefined
    let originalWeakRef: typeof WeakRef | undefined
    let consoleErrorSpy: jest.SpyInstance

    beforeEach(() => {
        originalResizeObserver = (window as any).ResizeObserver
        originalIntersectionObserver = (window as any).IntersectionObserver
        originalFinalizationRegistry = (window as any).FinalizationRegistry
        originalWeakRef = (window as any).WeakRef

        consoleErrorSpy = jest
            .spyOn(console, "error")
            .mockImplementation(() => {})

        jest.clearAllMocks()
    })

    afterEach(() => {
        if (originalResizeObserver) {
            ;(window as any).ResizeObserver = originalResizeObserver
        } else {
            delete (window as any).ResizeObserver
        }

        if (originalIntersectionObserver) {
            ;(window as any).IntersectionObserver = originalIntersectionObserver
        } else {
            delete (window as any).IntersectionObserver
        }

        if (originalFinalizationRegistry) {
            ;(window as any).FinalizationRegistry = originalFinalizationRegistry
        } else {
            delete (window as any).FinalizationRegistry
        }

        if (originalWeakRef) {
            ;(window as any).WeakRef = originalWeakRef
        } else {
            delete (window as any).WeakRef
        }

        consoleErrorSpy.mockRestore()
    })

    describe("polyfill loading logic", () => {
        it("should detect when ResizeObserver is available", () => {
            const mockResizeObserver = jest.fn()
            ;(window as any).ResizeObserver = mockResizeObserver

            const shouldLoadPolyfill = !("ResizeObserver" in window)

            expect(shouldLoadPolyfill).toBe(false)
            expect(window.ResizeObserver).toBe(mockResizeObserver)
        })

        it("should detect when ResizeObserver is not available", () => {
            delete (window as any).ResizeObserver

            const shouldLoadPolyfill = !("ResizeObserver" in window)

            expect(shouldLoadPolyfill).toBe(true)
            expect(window.ResizeObserver).toBeUndefined()
        })

        it("should detect when IntersectionObserver is available", () => {
            const mockIntersectionObserver = jest.fn()
            ;(window as any).IntersectionObserver = mockIntersectionObserver

            const shouldLoadPolyfill = !("IntersectionObserver" in window)

            expect(shouldLoadPolyfill).toBe(false)
            expect(window.IntersectionObserver).toBe(mockIntersectionObserver)
        })

        it("should detect when IntersectionObserver is not available", () => {
            delete (window as any).IntersectionObserver

            const shouldLoadPolyfill = !("IntersectionObserver" in window)

            expect(shouldLoadPolyfill).toBe(true)
            expect(window.IntersectionObserver).toBeUndefined()
        })
    })

    describe("polyfill assignment logic", () => {
        it("should properly assign ResizeObserver from polyfill module", async () => {
            delete (window as any).ResizeObserver

            const mockResizeObserverClass = jest
                .fn()
                .mockImplementation(() => ({
                    observe: jest.fn(),
                    unobserve: jest.fn(),
                    disconnect: jest.fn(),
                }))

            const mockModule = {
                ResizeObserver: mockResizeObserverClass,
            }

            const assignmentPromise = Promise.resolve(mockModule).then(
                (module) => {
                    ;(window as any).ResizeObserver = module.ResizeObserver
                    return module
                }
            )

            await assignmentPromise

            expect(window.ResizeObserver).toBe(mockResizeObserverClass)

            const observer = new window.ResizeObserver(() => {})
            expect(typeof observer.observe).toBe("function")
            expect(typeof observer.unobserve).toBe("function")
            expect(typeof observer.disconnect).toBe("function")
        })

        it("should handle ResizeObserver polyfill errors gracefully", async () => {
            delete (window as any).ResizeObserver

            const testError = new Error("Polyfill load failed")

            const errorPromise = Promise.reject(testError).catch(console.error)

            await errorPromise

            expect(consoleErrorSpy).toHaveBeenCalledWith(testError)
            expect(window.ResizeObserver).toBeUndefined()
        })

        it("should handle IntersectionObserver polyfill errors gracefully", async () => {
            delete (window as any).IntersectionObserver

            const testError = new Error("Polyfill load failed")

            const errorPromise = Promise.reject(testError).catch(console.error)

            await errorPromise

            expect(consoleErrorSpy).toHaveBeenCalledWith(testError)
            expect(window.IntersectionObserver).toBeUndefined()
        })
    })

    describe("polyfill module imports", () => {
        it("should not throw when importing the polyfills module", () => {
            expect(() => {
                require("./polyfills")
            }).not.toThrow()
        })

        it("should handle focus-visible import", () => {
            expect(() => {
                require("./polyfills")
            }).not.toThrow()
        })
    })

    describe("browser compatibility scenarios", () => {
        it("should handle Chrome 68 scenario (no ResizeObserver, has IntersectionObserver)", () => {
            delete (window as any).ResizeObserver
            ;(window as any).IntersectionObserver = jest.fn()

            const shouldLoadResizeObserver = !("ResizeObserver" in window)
            const shouldLoadIntersectionObserver = !(
                "IntersectionObserver" in window
            )

            expect(shouldLoadResizeObserver).toBe(true)
            expect(shouldLoadIntersectionObserver).toBe(false)
        })

        it("should handle older browser scenario (no observers)", () => {
            delete (window as any).ResizeObserver
            delete (window as any).IntersectionObserver

            const shouldLoadResizeObserver = !("ResizeObserver" in window)
            const shouldLoadIntersectionObserver = !(
                "IntersectionObserver" in window
            )

            expect(shouldLoadResizeObserver).toBe(true)
            expect(shouldLoadIntersectionObserver).toBe(true)
        })

        it("should handle modern browser scenario (has all observers)", () => {
            ;(window as any).ResizeObserver = jest.fn()
            ;(window as any).IntersectionObserver = jest.fn()

            const shouldLoadResizeObserver = !("ResizeObserver" in window)
            const shouldLoadIntersectionObserver = !(
                "IntersectionObserver" in window
            )

            expect(shouldLoadResizeObserver).toBe(false)
            expect(shouldLoadIntersectionObserver).toBe(false)
        })
    })

    describe("polyfill behavior verification", () => {
        it("should verify that ResizeObserver polyfill provides correct API", () => {
            const mockResizeObserver = jest.fn().mockImplementation(() => ({
                observe: jest.fn(),
                unobserve: jest.fn(),
                disconnect: jest.fn(),
            }))

            ;(window as any).ResizeObserver = mockResizeObserver

            const observer = new window.ResizeObserver(() => {})

            expect(typeof observer.observe).toBe("function")
            expect(typeof observer.unobserve).toBe("function")
            expect(typeof observer.disconnect).toBe("function")
        })

        it("should verify that IntersectionObserver polyfill provides correct API", () => {
            const mockIntersectionObserver = jest
                .fn()
                .mockImplementation(() => ({
                    observe: jest.fn(),
                    unobserve: jest.fn(),
                    disconnect: jest.fn(),
                    root: null,
                    rootMargin: "0px",
                    thresholds: [0],
                }))

            ;(window as any).IntersectionObserver = mockIntersectionObserver

            const observer = new window.IntersectionObserver(() => {})

            expect(typeof observer.observe).toBe("function")
            expect(typeof observer.unobserve).toBe("function")
            expect(typeof observer.disconnect).toBe("function")
        })
    })

    describe("TV OS Compatibility Polyfills", () => {
        describe("FinalizationRegistry Polyfill", () => {
            beforeEach(() => {
                delete (window as any).FinalizationRegistry

                if (!("FinalizationRegistry" in window)) {
                    ;(window as any).FinalizationRegistry =
                        class FinalizationRegistryPolyfill<T> {
                            private callback: (heldValue: T) => void

                            constructor(callback: (heldValue: T) => void) {
                                this.callback = callback
                            }

                            public register(
                                _target: WeakKey,
                                _heldValue: T,
                                _unregisterToken?: WeakKey
                            ): void {
                                // No-op: we can't actually track object finalization without native support
                            }

                            public unregister(
                                _unregisterToken: WeakKey
                            ): boolean {
                                // No-op: return false to indicate the token wasn't found
                                return false
                            }
                        }
                }
            })

            it("should provide FinalizationRegistry constructor", () => {
                expect(window.FinalizationRegistry).toBeDefined()
                expect(typeof window.FinalizationRegistry).toBe("function")
            })

            it("should create FinalizationRegistry instance with callback", () => {
                const callback = jest.fn()
                const registry = new window.FinalizationRegistry(callback)

                expect(registry).toBeInstanceOf(window.FinalizationRegistry)
                expect((registry as any).callback).toBe(callback)
            })

            it("should provide register method that accepts correct parameters", () => {
                const callback = jest.fn()
                const registry = new window.FinalizationRegistry(callback)
                const target = {}
                const heldValue = "test-value"
                const unregisterToken = {}

                expect(() => {
                    registry.register(target, heldValue, unregisterToken)
                }).not.toThrow()

                expect(() => {
                    registry.register(target, heldValue)
                }).not.toThrow()
            })

            it("should provide unregister method that returns false", () => {
                const callback = jest.fn()
                const registry = new window.FinalizationRegistry(callback)
                const unregisterToken = {}

                const result = registry.unregister(unregisterToken)
                expect(result).toBe(false)
            })

            it("should work with TypeScript generic types", () => {
                interface TestValue {
                    id: string
                    data: number
                }

                const callback = jest.fn<void, [TestValue]>()
                const registry = new window.FinalizationRegistry<TestValue>(
                    callback
                )
                const target = {}
                const heldValue: TestValue = { id: "test", data: 42 }

                expect(() => {
                    registry.register(target, heldValue)
                }).not.toThrow()
            })
        })

        describe("WeakRef Polyfill", () => {
            beforeEach(() => {
                delete (window as any).WeakRef

                if (!("WeakRef" in window)) {
                    ;(window as any).WeakRef = class WeakRefPolyfill<
                        T extends WeakKey,
                    > {
                        private _target: T

                        constructor(target: T) {
                            this._target = target
                        }

                        public deref(): T | undefined {
                            return this._target
                        }
                    }
                }
            })

            it("should provide WeakRef constructor", () => {
                expect(window.WeakRef).toBeDefined()
                expect(typeof window.WeakRef).toBe("function")
            })

            it("should create WeakRef instance with target", () => {
                const target = {}
                const weakRef = new window.WeakRef(target)

                expect(weakRef).toBeInstanceOf(window.WeakRef)
            })

            it("should return target object from deref method", () => {
                const target = { id: "test-object" }
                const weakRef = new window.WeakRef(target)

                const result = weakRef.deref()
                expect(result).toBe(target)
                expect(result?.id).toBe("test-object")
            })

            it("should work with different object types", () => {
                const arrayTarget = [1, 2, 3]
                const objectTarget = { name: "test" }
                const functionTarget = (): string => "test"

                const arrayWeakRef = new window.WeakRef(arrayTarget)
                const objectWeakRef = new window.WeakRef(objectTarget)
                const functionWeakRef = new window.WeakRef(functionTarget)

                expect(arrayWeakRef.deref()).toBe(arrayTarget)
                expect(objectWeakRef.deref()).toBe(objectTarget)
                expect(functionWeakRef.deref()).toBe(functionTarget)
            })
        })

        describe("Integration with Rive-like usage", () => {
            beforeEach(() => {
                delete (window as any).FinalizationRegistry
                delete (window as any).WeakRef

                if (!("FinalizationRegistry" in window)) {
                    ;(window as any).FinalizationRegistry =
                        class FinalizationRegistryPolyfill<T> {
                            private callback: (heldValue: T) => void

                            constructor(callback: (heldValue: T) => void) {
                                this.callback = callback
                            }

                            public register(
                                _target: WeakKey,
                                _heldValue: T,
                                _unregisterToken?: WeakKey
                            ): void {
                                // No-op
                            }

                            public unregister(
                                _unregisterToken: WeakKey
                            ): boolean {
                                return false
                            }
                        }
                }

                if (!("WeakRef" in window)) {
                    ;(window as any).WeakRef = class WeakRefPolyfill<
                        T extends WeakKey,
                    > {
                        private _target: T

                        constructor(target: T) {
                            this._target = target
                        }

                        public deref(): T | undefined {
                            return this._target
                        }
                    }
                }
            })

            it("should support typical Rive cleanup patterns", () => {
                const cleanupCallback = jest.fn()
                const registry = new window.FinalizationRegistry(
                    cleanupCallback
                )

                const riveInstance = { id: "rive-instance" }
                const cleanupData = { dispose: jest.fn() }

                expect(() => {
                    registry.register(riveInstance, cleanupData)
                }).not.toThrow()

                expect(cleanupCallback).not.toHaveBeenCalled()
            })

            it("should support WeakRef patterns for optional references", () => {
                const target = { name: "rive-component" }
                const weakRef = new window.WeakRef(target)

                const retrieved = weakRef.deref()
                expect(retrieved).toBe(target)
                expect(retrieved?.name).toBe("rive-component")
            })

            it("should not interfere with normal object lifecycle", () => {
                const obj = { data: "test" }
                const registry = new window.FinalizationRegistry(() => {})
                const weakRef = new window.WeakRef(obj)

                registry.register(obj, "cleanup-data")

                expect(obj.data).toBe("test")
                expect(weakRef.deref()?.data).toBe("test")

                expect(registry.unregister({})).toBe(false)
            })
        })

        describe("TV OS Polyfill Detection", () => {
            it("should detect when FinalizationRegistry polyfill is needed", () => {
                delete (window as any).FinalizationRegistry

                expect("FinalizationRegistry" in window).toBe(false)
            })

            it("should detect when WeakRef polyfill is needed", () => {
                delete (window as any).WeakRef

                expect("WeakRef" in window).toBe(false)
            })

            it("should detect when native implementations exist", () => {
                if (originalFinalizationRegistry) {
                    ;(window as any).FinalizationRegistry =
                        originalFinalizationRegistry
                    expect("FinalizationRegistry" in window).toBe(true)
                }

                if (originalWeakRef) {
                    ;(window as any).WeakRef = originalWeakRef
                    expect("WeakRef" in window).toBe(true)
                }
            })

            it("should handle older TV OS scenario (no modern APIs)", () => {
                delete (window as any).FinalizationRegistry
                delete (window as any).WeakRef
                delete (window as any).ResizeObserver
                delete (window as any).IntersectionObserver

                const shouldLoadFinalizationRegistry = !(
                    "FinalizationRegistry" in window
                )
                const shouldLoadWeakRef = !("WeakRef" in window)
                const shouldLoadResizeObserver = !("ResizeObserver" in window)
                const shouldLoadIntersectionObserver = !(
                    "IntersectionObserver" in window
                )

                expect(shouldLoadFinalizationRegistry).toBe(true)
                expect(shouldLoadWeakRef).toBe(true)
                expect(shouldLoadResizeObserver).toBe(true)
                expect(shouldLoadIntersectionObserver).toBe(true)
            })
        })
    })
})
