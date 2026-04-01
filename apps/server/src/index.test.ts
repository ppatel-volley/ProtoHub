import request from "supertest"

let mockRedis: { status: string; on: jest.Mock; quit: jest.Mock }

const mockVGFServer = jest.fn().mockImplementation(() => ({
    start: jest.fn(),
}))

describe("Server", () => {
    beforeEach(() => {
        jest.clearAllMocks()
        jest.resetModules()

        mockRedis = {
            status: "ready",
            on: jest.fn(),
            quit: jest.fn(),
        }

        jest.mock("ioredis", () => {
            return jest.fn().mockImplementation(() => mockRedis)
        })

        jest.mock("@volley/vgf/server", () => ({
            VGFServer: mockVGFServer,
            RedisStorage: jest.fn(),
            SocketIOTransport: jest.fn(),
        }))
    })

    describe("server init", () => {
        it("should initialize VGFServer with correct configuration schema", () => {
            require("./index")

            expect(mockVGFServer).toHaveBeenCalled()
            const vgfServerCall = mockVGFServer.mock.calls[0][0]

            expect(vgfServerCall).toBeDefined()
            expect(typeof vgfServerCall.port).toBe("number")
            expect(vgfServerCall.httpServer).toBeDefined()
            expect(typeof vgfServerCall.app).toBe("function")
            expect(vgfServerCall.redisClient).toBeDefined()
            expect(vgfServerCall.transport).toBeDefined()
            expect(vgfServerCall.storage).toBeDefined()
            expect(vgfServerCall.game).toBeDefined()
        })
    })

    describe("healthcheck", () => {
        let app: any

        beforeEach(() => {
            const { app: freshApp } = jest.requireActual("./index")
            app = freshApp
        })

        it("should return 200 and health stats when redis is connected and the server is running", async () => {
            const response = await request(app).get("/health")

            expect(response.status).toBe(200)
            expect(response.body).toMatchObject({
                status: "OK",
                redis: {
                    status: "ready",
                    connected: true,
                },
            })
            expect(response.body.timestamp).toBeDefined()
            expect(response.body.uptime).toBeDefined()
            expect(response.body.memory).toBeDefined()
            expect(response.body.environment).toBeDefined()
            expect(response.body.system).toBeDefined()
            expect(response.body.server).toBeDefined()
        })

        it("should reflect redis status in response", async () => {
            mockRedis.status = "connecting"

            const response = await request(app).get("/health")

            expect(response.status).toBe(200)
            expect(response.body).toMatchObject({
                status: "OK",
                redis: {
                    status: "connecting",
                    connected: false,
                },
            })
        })

        it("should return 500 when an error occurs", async () => {
            Object.defineProperty(mockRedis, "status", {
                get: () => {
                    throw new Error("Redis connection error")
                },
            })

            const response = await request(app).get("/health")

            expect(response.status).toBe(500)
            expect(response.body).toMatchObject({
                status: "ERROR",
                error: "Redis connection error",
            })
        })
    })
})
