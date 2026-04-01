interface MockExperimentManager {
    initialize: jest.Mock<Promise<void>, [accountId: string]>
    getVariant: jest.Mock<
        { value: string; payload: Record<string, unknown> },
        [flag: string]
    >
    onInitialized: jest.Mock<() => void, [callback: () => void]>
}

export const getExperimentManager = jest.fn().mockReturnValue({
    initialize: jest.fn().mockResolvedValue(undefined),
    getVariant: jest.fn().mockReturnValue({ value: "control", payload: {} }),
    onInitialized: jest
        .fn()
        .mockImplementation((callback: () => void) => callback),
}) as jest.Mock<MockExperimentManager>

export const resetExperimentManager = jest.fn()
