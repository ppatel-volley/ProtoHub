import type { IndexHtmlTransformContext, IndexHtmlTransformHook } from "vite"

import { BASE_PATH, htmlFaviconPlugin } from "./htmlFaviconPlugin"

describe("htmlFaviconPlugin", () => {
    const mockHtml = `<!DOCTYPE html>
<html>
<head>
  <link rel="icon" type="image/png" href="/volley-favicon.png" />
</head>
<body></body>
</html>`

    const getTransformHandler = (): IndexHtmlTransformHook => {
        const plugin = htmlFaviconPlugin()
        const transform = plugin.transformIndexHtml

        if (
            typeof transform === "function" ||
            !transform ||
            !("handler" in transform)
        ) {
            throw new Error("Expected transformIndexHtml to be an object")
        }

        return transform.handler
    }

    it("should transform favicon path to root locally", () => {
        const handler = getTransformHandler()

        const ctx: IndexHtmlTransformContext = {
            server: {} as any,
        } as IndexHtmlTransformContext

        const result = handler(mockHtml, ctx)

        expect(result).toContain('href="/volley-favicon.png"')
        expect(result).not.toContain(`href="${BASE_PATH}volley-favicon.png"`)
    })

    it("should transform favicon path to base path in remote environments", () => {
        const handler = getTransformHandler()

        const ctx: IndexHtmlTransformContext = {
            server: undefined,
        } as IndexHtmlTransformContext

        const result = handler(mockHtml, ctx)

        expect(result).toContain(`href="${BASE_PATH}volley-favicon.png"`)
        expect(result).not.toContain('href="/volley-favicon.png"')
    })

    it("should not transform other href attributes", () => {
        const htmlWithMultipleHrefs = `<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="/styles.css" />
  <link rel="icon" type="image/png" href="/volley-favicon.png" />
  <link rel="manifest" href="/manifest.json" />
</head>
<body></body>
</html>`

        const handler = getTransformHandler()

        const ctx: IndexHtmlTransformContext = {
            server: undefined,
        } as IndexHtmlTransformContext

        const result = handler(htmlWithMultipleHrefs, ctx)

        expect(result).toContain('href="/styles.css"')
        expect(result).toContain('href="/manifest.json"')
        expect(result).toContain(`href="${BASE_PATH}volley-favicon.png"`)
    })
})
