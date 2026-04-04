import type { Plugin } from "vite"

// Served from game-clients-dev.volley.tv/protohub/ (same origin as VWR)
// so BrowserIpc RPC works for D-pad forwarding on Fire TV.
export const BASE_PATH = "/protohub/"

export const htmlFaviconPlugin = (): Plugin => {
    return {
        name: "html-favicon-transform",
        transformIndexHtml: {
            order: "pre",
            handler(html, ctx): string {
                const base = ctx.server ? "/" : BASE_PATH
                return html.replace(
                    /href="\/volley-favicon\.png"/,
                    `href="${base}volley-favicon.png"`
                )
            },
        },
    }
}
