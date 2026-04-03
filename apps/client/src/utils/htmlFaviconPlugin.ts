import type { Plugin } from "vite"

export const BASE_PATH = "/"

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
