export class TrackingEventBuilder {
    constructor(
        _schemaMap: Record<string, unknown>,
        _options?: Record<string, unknown>
    ) {}

    public build(
        eventName: string,
        properties: Record<string, unknown>
    ): {
        eventName: string
        properties: Record<string, unknown>
    } {
        return {
            eventName,
            properties,
        }
    }
}
