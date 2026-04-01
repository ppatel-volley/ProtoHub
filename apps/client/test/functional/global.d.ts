import type { AppConfig } from "../../src/types/globals"

declare global {
    interface Window {
        mockVariantValue?: { value?: string }
        Experiment?: {
            initialize: (key: string) => {
                fetch: () => Promise<void>
                variant: (flag: string) => { value?: string } | Record<string, never>
            }
        }
        APP_CONFIG?: AppConfig
    }

    namespace ImportMeta {
        interface ImportMetaEnv {
            VITE_VOLLEY_LOGO_DISPLAY_MILLIS?: string
        }
    }
}