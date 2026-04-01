import "focus-visible"

if (!("FinalizationRegistry" in window)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    ;(window as any).FinalizationRegistry = class FinalizationRegistryPolyfill<
        T,
    > {
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

        public unregister(_unregisterToken: WeakKey): boolean {
            return false
        }
    }
}

// Polyfill ResizeObserver if not available
if (!("ResizeObserver" in window)) {
    import("@juggle/resize-observer")
        .then((module) => {
            window.ResizeObserver = module.ResizeObserver
        })
        .catch(console.error)
}

// Polyfill IntersectionObserver if not available
if (!("IntersectionObserver" in window)) {
    import("intersection-observer").catch(console.error)
}
