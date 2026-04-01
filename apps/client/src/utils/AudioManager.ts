import { Howl, Howler } from "howler"
import { useEffect, useRef } from "react"

import { BASE_URL } from "../config/envconfig"
import { isFireTV, isSamsungTV } from "../config/platformDetection"
import { useNativeFocus } from "../hooks/useNativeFocus"

let _html5Fallback: boolean | null = null

function shouldUseHtml5Fallback(): boolean {
    if (_html5Fallback === null) {
        _html5Fallback = isFireTV() || isSamsungTV()
        if (_html5Fallback) {
            Howler.usingWebAudio = false
        }
    }
    return _html5Fallback
}

interface AudioPlayerCompatible {
    play: () => void
    pause: () => void
    stop: () => void
    mute: (onOff: boolean) => void
    loop: (onOff: boolean) => void
    volume: (vol: number) => void
    onEnded: (callback: () => void) => () => void
}

const useAudioPlayerWithFallback = (
    html5Fallback: boolean,
    src: string
): AudioPlayerCompatible => {
    const didInit = useRef<AudioPlayerCompatible | null>(null)

    if (didInit.current) {
        return didInit.current
    }

    if (html5Fallback) {
        const audio = new Audio()
        audio.src = src
        didInit.current = {
            play: (): void => {
                void audio.play()
            },
            pause: (): void => {
                audio.pause()
            },
            stop: (): void => {
                audio.pause()
                audio.currentTime = 0
            },
            mute: (onOff): void => {
                audio.volume = onOff ? 0 : 1
            },
            loop: (): void => {
                audio.loop = true
            },
            volume: (vol: number): void => {
                audio.volume = vol
            },
            onEnded: (callback: () => void): (() => void) => {
                audio.addEventListener("ended", callback)
                return (): void => {
                    audio.removeEventListener("ended", callback)
                }
            },
        }
        return didInit.current
    } else {
        const howl = new Howl({ src: [src], html5: html5Fallback })
        didInit.current = {
            play: (): void => {
                void howl.play()
            },
            pause: (): void => {
                howl.pause()
            },
            stop: (): void => {
                howl.stop()
            },
            mute: (onOff): void => {
                howl.mute(onOff)
            },
            loop: (): void => {
                howl.loop(true)
            },
            volume: (vol: number): void => {
                howl.volume(vol)
            },
            onEnded: (callback: () => void): (() => void) => {
                howl.on("end", callback)
                return (): void => {
                    howl.off("end", callback)
                }
            },
        }
        return didInit.current
    }
}

export const usePlaySound = (src: AudioPlayerCompatible): void => {
    useNativeFocus(src.play, src.pause)
    useEffect(() => {
        return (): void => {
            src.stop()
        }
    }, [src])
}

export const useSuccessAudio = (): AudioPlayerCompatible =>
    useAudioPlayerWithFallback(
        shouldUseHtml5Fallback(),
        `${BASE_URL}assets/sfx/success.m4a`
    )

export const useSelectionAudio = (): AudioPlayerCompatible =>
    useAudioPlayerWithFallback(
        shouldUseHtml5Fallback(),
        `${BASE_URL}assets/sfx/selection.m4a`
    )

export const useOnboardingAudio = (): AudioPlayerCompatible =>
    useAudioPlayerWithFallback(
        shouldUseHtml5Fallback(),
        `${BASE_URL}assets/sfx/onboarding.m4a`
    )

export class AudioManager {
    private static audioCache: Map<string, HTMLAudioElement> = new Map()

    private static async loadAudio(url: string): Promise<HTMLAudioElement> {
        if (this.audioCache.has(url)) {
            const cachedAudio = this.audioCache.get(url)!
            cachedAudio.currentTime = 0
            return cachedAudio
        }

        return new Promise<HTMLAudioElement>((resolve, reject) => {
            const audio = new Audio()

            const onLoad = (): void => {
                audio.removeEventListener("canplaythrough", onLoad)
                audio.removeEventListener("error", onError)

                this.audioCache.set(url, audio)
                resolve(audio)
            }

            const onError = (): void => {
                audio.removeEventListener("canplaythrough", onLoad)
                audio.removeEventListener("error", onError)
                reject(new Error(`Failed to load audio: ${url}`))
            }

            audio.addEventListener("canplaythrough", onLoad)
            audio.addEventListener("error", onError)
            audio.preload = "auto"
            audio.src = url
        })
    }

    private static async playAudio(audio: HTMLAudioElement): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const onEnded = (): void => {
                audio.removeEventListener("ended", onEnded)
                audio.removeEventListener("error", onError)
                resolve()
            }

            const onError = (): void => {
                audio.removeEventListener("ended", onEnded)
                audio.removeEventListener("error", onError)
                reject(new Error("Audio playback failed"))
            }

            audio.addEventListener("ended", onEnded)
            audio.addEventListener("error", onError)

            const playPromise = audio.play()

            if (playPromise !== undefined) {
                playPromise.catch((error) => {
                    audio.removeEventListener("ended", onEnded)
                    audio.removeEventListener("error", onError)
                    reject(new Error(String(error)))
                })
            }
        })
    }

    public static clearCache(): void {
        this.audioCache.clear()
    }
}
