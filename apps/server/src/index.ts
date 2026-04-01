/**
 * Hub server entry point.
 *
 * Sets up an Express server with VGF (Voice Gaming Framework) integration for
 * multiplayer session coordination. The server is intentionally minimal — Hub is
 * a game launcher, not a game itself. VGF handles WebSocket connections and state
 * sync; the only custom logic is the single {@link hubSession} ruleset.
 *
 * Endpoints:
 * - `GET /health` — Health check reporting Redis status, uptime, and memory usage
 * - WebSocket connections managed by VGF's SocketIO transport
 *
 * @see hubSession for the game ruleset definition
 */
import "./constants/Environment"

import { VGFServer } from "@volley/vgf/server"
import { RedisStorage } from "@volley/vgf/server"
import { SocketIOTransport } from "@volley/vgf/server"
import cors from "cors"
import type { Express } from "express"
import express from "express"
import { createServer } from "http"
import Redis from "ioredis"
import process from "process"

import { hubSession } from "./hubSession"

const PORT = parseInt(process.env.PORT || "3000")
const REDIS_HOST = process.env.REDIS_HOST || "localhost"
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379")

const redisClient = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
})

const app: Express = express()
app.use(express.json({ limit: "10mb" }))
app.use(cors({ origin: "*" }))

export { app }

app.get("/health", (_, res) => {
    try {
        const stats = {
            status: "OK",
            timestamp: new Date().toISOString(),
            redis: {
                status: redisClient.status,
                connected: redisClient.status === "ready",
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                pid: process.pid,
                cwd: process.cwd(),
            },
            system: {
                cpuUsage: process.cpuUsage(),
            },
            server: {
                port: PORT,
                host: process.env.HOST || "localhost",
            },
        }
        res.status(200).json(stats)
    } catch (error) {
        res.status(500).json({
            status: "ERROR",
            error: error instanceof Error ? error.message : "Unknown error",
        })
    }
})

// eslint-disable-next-line @typescript-eslint/no-misused-promises
const httpServer = createServer(app)

const storage = new RedisStorage({
    redisClient,
})

const transport = new SocketIOTransport({
    httpServer,
    redisClient,
    storage,
})

const server = new VGFServer({
    redisClient,
    port: PORT,
    httpServer,
    app,
    transport,
    storage,
    game: hubSession,
})

server.start()
