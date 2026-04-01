import {
    type AssetKey,
    BRANDED_ASSETS,
    BRANDED_COPY,
    type CopyKey,
    getActiveBrand,
    getAsset,
    getCopy,
    isWeekendRebrandActive,
    subscribeToBrand,
} from "./branding"

describe("branding", () => {
    describe("isWeekendRebrandActive", () => {
        it("always returns true", () => {
            expect(isWeekendRebrandActive()).toBe(true)
        })
    })

    describe("getActiveBrand", () => {
        it("returns weekend", () => {
            expect(getActiveBrand()).toBe("weekend")
        })
    })

    describe("getCopy", () => {
        it("returns weekend copy", () => {
            expect(getCopy("logoAlt")).toBe("Weekend Logo")
        })

        it("returns correct copy for all keys", () => {
            const keys = Object.keys(BRANDED_COPY) as CopyKey[]
            keys.forEach((key) => {
                const result = getCopy(key)
                expect(result).toBe(BRANDED_COPY[key].weekend)
            })
        })
    })

    describe("BRANDED_COPY", () => {
        it("has volley and weekend variants for all keys", () => {
            const keys = Object.keys(BRANDED_COPY) as CopyKey[]
            keys.forEach((key) => {
                expect(BRANDED_COPY[key]).toHaveProperty("volley")
                expect(BRANDED_COPY[key]).toHaveProperty("weekend")
                expect(typeof BRANDED_COPY[key].volley).toBe("string")
                expect(typeof BRANDED_COPY[key].weekend).toBe("string")
            })
        })

        it("volley copy contains Volley and weekend copy contains Weekend", () => {
            expect(BRANDED_COPY.logoAlt.volley).toContain("Volley")
            expect(BRANDED_COPY.logoAlt.weekend).toContain("Weekend")
        })
    })

    describe("getAsset", () => {
        it("returns weekend asset", () => {
            expect(getAsset("logo")).toBe(BRANDED_ASSETS.logo.weekend)
        })

        it("returns correct asset for all keys", () => {
            const keys = Object.keys(BRANDED_ASSETS) as AssetKey[]
            keys.forEach((key) => {
                const result = getAsset(key)
                expect(result).toBe(BRANDED_ASSETS[key].weekend)
            })
        })
    })

    describe("BRANDED_ASSETS", () => {
        it("has volley and weekend variants for all keys", () => {
            const keys = Object.keys(BRANDED_ASSETS) as AssetKey[]
            keys.forEach((key) => {
                expect(BRANDED_ASSETS[key]).toHaveProperty("volley")
                expect(BRANDED_ASSETS[key]).toHaveProperty("weekend")
                expect(typeof BRANDED_ASSETS[key].volley).toBe("string")
                expect(typeof BRANDED_ASSETS[key].weekend).toBe("string")
            })
        })

        it("volley assets contain volley and weekend assets contain weekend", () => {
            expect(BRANDED_ASSETS.logo.volley).toContain("volley")
            expect(BRANDED_ASSETS.logo.weekend).toContain("weekend")
        })
    })

    describe("subscribeToBrand", () => {
        it("returns an unsubscribe function", () => {
            const unsubscribe = subscribeToBrand(jest.fn())
            expect(typeof unsubscribe).toBe("function")
        })
    })
})
