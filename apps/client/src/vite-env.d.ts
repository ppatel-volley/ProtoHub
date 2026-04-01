/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_STAGE: string
    readonly VITE_SPEECH_RECOGNITION_ENDPOINT: string
    readonly VITE_AUDIO_GENERATION_ENDPOINT: string
    readonly VITE_VOLLEY_LOGO_DISPLAY_MILLIS: string
    readonly VITE_LOCAL_SQ: string
    readonly VITE_EXPERIMENT_ASSETS_CDN_URL: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
