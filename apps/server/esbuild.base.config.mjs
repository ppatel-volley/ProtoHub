export const base = {
    platform: "node",
    entryPoints: ["./src/index.ts"],
    outfile: "dist/index.js",
    bundle: true,
    minify: true,
    sourcemap: true,
    treeShaking: true,
    target: "node22",
    tsconfig: "./tsconfig.json",
}
