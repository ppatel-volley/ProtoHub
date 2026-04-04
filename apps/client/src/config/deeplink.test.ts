import { clearDeeplink, getDeeplink } from "./deeplink"

describe("deeplink util", () => {
    const originalLocation = window.location
    const originalReplaceState = window.history.replaceState.bind(
        window.history
    )
    let mockReplaceState: jest.Mock

    beforeEach(() => {
        // @ts-expect-error override for test
        delete window.location
        // @ts-expect-error override for test
        window.location = {
            ...originalLocation,
            search: "",
            href: "https://example.com/",
        } as Location
        mockReplaceState = jest.fn()
        window.history.replaceState = mockReplaceState
    })

    afterEach(() => {
        // @ts-expect-error override for test
        window.location = originalLocation
        window.history.replaceState = originalReplaceState
        jest.clearAllMocks()
    })

    it("returns the deeplink value if present in the URL", () => {
        window.location.search = "?deeplink=game123_campaign456"
        expect(getDeeplink()).toStrictEqual({
            gameId: "game123",
            campaignId: "campaign456",
        })
    })

    it("returns the deeplink value if present in the URL, no campaign id", () => {
        window.location.search = "?deeplink=game123"
        expect(getDeeplink()).toStrictEqual({
            gameId: "game123",
            campaignId: "",
        })
    })

    it("returns undefined if deeplink is not present", () => {
        window.location.search = "?foo=bar"
        expect(getDeeplink()).toBeUndefined()
    })

    it("returns undefined if search is empty", () => {
        window.location.search = ""
        expect(getDeeplink()).toBeUndefined()
    })

    it("removes the deeplink parameter from the URL", () => {
        window.location.href = "https://example.com/?deeplink=game123&foo=bar"
        window.location.search = "?deeplink=game123&foo=bar"
        clearDeeplink()
        expect(mockReplaceState).toHaveBeenCalledWith(
            {},
            "",
            "https://example.com/?foo=bar"
        )
    })

    it("does nothing if deeplink is not present", () => {
        window.location.href = "https://example.com/?foo=bar"
        window.location.search = "?foo=bar"
        clearDeeplink()
        expect(mockReplaceState).toHaveBeenCalledWith(
            {},
            "",
            "https://example.com/?foo=bar"
        )
    })
})
