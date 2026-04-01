export enum Platform {
    Web = "WEB",
    Mobile = "MOBILE",
    FireTV = "FIRE_TV",
    LGTV = "LGTV",
    SamsungTV = "SAMSUNG_TV",
}

export enum MobileType {
    IosAppClip = "IOS_APP_CLIP",
    None = "NONE",
}

export function getPlatform(): Platform {
    return Platform.Web
}

export function getQueryParam(_param: string): string | null {
    return null
}

export function getMobileType(): MobileType {
    return MobileType.None
}

export function getAppVersion(): string | null {
    return null
}

export default {
    Platform,
    MobileType,
    getPlatform,
    getMobileType,
    getQueryParam,
    getAppVersion,
}
