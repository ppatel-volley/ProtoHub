/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_VOLLEY_LOGO_DISPLAY_MILLIS: string
    readonly VITE_EXPERIMENT_ASSETS_CDN_URL: string
    readonly VITE_OVERRIDE_GAME_ORCHESTRATION: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}

declare const __APP_VERSION__: string
