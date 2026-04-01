import legacy from "@vitejs/plugin-legacy"
import react from "@vitejs/plugin-react-swc"
import { FontaineTransform } from "fontaine"
import { defineConfig } from "vite"

import { BASE_PATH, htmlFaviconPlugin } from "./src/utils/htmlFaviconPlugin"
import { getManualChunk } from "./src/utils/viteChunks"

// https://vite.dev/config/
export default defineConfig(({ command }) => {
    return {
        server: {
            allowedHosts: true,
        },
        preview: {
            allowedHosts: true,
        },
        plugins: [
            htmlFaviconPlugin(),
            FontaineTransform.vite({
                fallbacks: ["Arial", "system-ui", "sans-serif"],
                resolvePath: (id) => new URL(`./public${id}`, import.meta.url),
            }),
            react(),
            legacy({
                targets: ["chrome >= 68"],
                renderLegacyChunks: true,
                modernPolyfills: [
                    "es.global-this",
                    "es.array.flat",
                    "es.array.flat-map",
                    "es.object.from-entries",
                    "es.string.match-all",
                    "es.string.replace-all",
                    "es.array.at",
                ],
            }),
        ],
        base: command === "build" ? BASE_PATH : "/",
        define: {
            __APP_VERSION__: JSON.stringify(
                process.env.npm_package_version || "unknown"
            ),
        },
        build: {
            target: ["chrome68"],
            sourcemap: true, // Generate source maps for datadog introspection
            rollupOptions: {
                output: {
                    sourcemapExcludeSources: false, // for datadog
                    manualChunks: getManualChunk,
                },
            },
        },
    }
})
