export function envVar(key: string, defaultValue: string): string
export function envVar<T>(
    key: string,
    defaultValue: T,
    parse: (s: string) => T
): T
export function envVar<T>(
    key: string,
    defaultValue: T,
    parse?: (s: string) => T
): T {
    const value = process.env[key]
    if (!value) return defaultValue
    return parse ? parse(value) : (value as T)
}
