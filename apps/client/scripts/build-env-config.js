import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get version from package.json
const packageJsonPath = path.resolve(__dirname, "../package.json")
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"))
const version = packageJson.version

// Get the environment from environment variable or use default
const env = process.env.ENVIRONMENT || "local"

// Validate environment
if (!["staging", "production", "dev", "local"].includes(env)) {
    console.error(
        `Error: Invalid environment "${env}". Must be "local", "dev", "staging", or "production".`
    )
    process.exit(1)
}

// Path to the dist directory
// This is to not require build step to push config to production
const distDir = path.resolve(__dirname, "../dist")

// Path to the public directory
// This is to allow local dev to access the config.js file
const publicDir = path.resolve(__dirname, "../public")

// Create public directory if it doesn't exist
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true })
}
const configFilePathPublic = path.join(publicDir, "config.js")

if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true })
}
const configFilePathDist = path.join(distDir, "config.js")

// Get the config for the specified environment
const config = {
    version,
    BACKEND_SERVER_ENDPOINT:
        process.env.BACKEND_SERVER_ENDPOINT || "http://localhost:3000",
    AMPLITUDE_EXPERIMENT_KEY:
        process.env.AMPLITUDE_EXPERIMENT_KEY ||
        "client-YWqgSE0zE4POEO137ZSw2J9XkmNO6QYL",
    environment: process.env.ENVIRONMENT || "local",
    VOLLEY_LOGO_DISPLAY_MILLIS:
        process.env.VOLLEY_LOGO_DISPLAY_MILLIS || "2000",
    SEGMENT_WRITE_KEY:
        process.env.SEGMENT_WRITE_KEY || "GplqCvL1EzLnZNpAHYGqObnDzrAtgoAS",
    DATADOG_APPLICATION_ID:
        process.env.DATADOG_APPLICATION_ID || "ecb2cc5c-e9e7-4b5a-84db-5a30226cf47b",
    DATADOG_CLIENT_TOKEN:
        process.env.DATADOG_CLIENT_TOKEN || "puba0d4f79e1c746beb2eb899c779858f08",
    BIFROST_API_URL:
        process.env.BIFROST_API_URL || "/bifrost-api",
    CRUCIBLE_REGISTRY_API_URL:
        process.env.CRUCIBLE_REGISTRY_API_URL || "",
}

// Generate the config.js content
const configFileContent = `// Configuration for ${env} - Generated on ${new Date().toISOString()}
window.APP_CONFIG = ${JSON.stringify(config, null, 2)};
`

// Write the config.js file to the public directory
fs.writeFileSync(configFilePathPublic, configFileContent)
// Write the config.js file to the dist directory
fs.writeFileSync(configFilePathDist, configFileContent)

console.log(
    `✅ Environment config for "${env}" successfully generated at ${configFilePathDist}`
)
