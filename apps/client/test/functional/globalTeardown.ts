import { amplitudeServer } from "./amplitudeMock"

function globalTeardown(): void {
    amplitudeServer.close()
}

export default globalTeardown
