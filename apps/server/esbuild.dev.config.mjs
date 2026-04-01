import { default as start } from "@es-exec/esbuild-plugin-start"
import { build } from "esbuild"

import { base } from "./esbuild.base.config.mjs"

await build({
    ...base,
    minify: false,
    plugins: [
        start({
            script: "node ./dist/index.js --inspect",
        }),
    ],
})
