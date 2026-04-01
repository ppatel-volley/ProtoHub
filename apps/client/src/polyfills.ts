import "focus-visible"

// Patch Element.prototype.animate for older WebKit/Chrome on smart TVs (e.g., LG webOS)
// that throw on negative duration values used by motion/framer-motion
if (typeof Element.prototype.animate === "function") {
    // eslint-disable-next-line @typescript-eslint/unbound-method
    const originalAnimate = Element.prototype.animate
    Element.prototype.animate = function (
        keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
        options?: number | KeyframeAnimationOptions
    ): Animation {
        try {
            let sanitizedOptions = options
            if (typeof sanitizedOptions === "number" && sanitizedOptions < 0) {
                sanitizedOptions = 0
            } else if (
                sanitizedOptions &&
                typeof sanitizedOptions === "object" &&
                typeof sanitizedOptions.duration === "number" &&
                sanitizedOptions.duration < 0
            ) {
                sanitizedOptions = { ...sanitizedOptions, duration: 0 }
            }
            return originalAnimate.call(this, keyframes, sanitizedOptions)
        } catch {
            return originalAnimate.call(this, [], { duration: 0 })
        }
    }
}

if (!("FinalizationRegistry" in window)) {
    // Simple polyfill that provides the basic interface without actual finalization
    // This is safe for Rive usage as it gracefully degrades without memory cleanup
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
            // No-op: we can't actually track object finalization without native support
            // Rive will work without this, just without automatic cleanup
        }

        public unregister(_unregisterToken: WeakKey): boolean {
            // No-op: return false to indicate the token wasn't found
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
// Note: intersection-observer has side effects and assigns to window automatically
if (!("IntersectionObserver" in window)) {
    import("intersection-observer").catch(console.error)
}
