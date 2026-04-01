import type { CSSProperties, FC } from "react"

interface RiveProps {
    src?: string
    artboard?: string
    animations?: string[]
    stateMachines?: string[]
    layout?: unknown
    autoplay?: boolean
    style?: CSSProperties
    onStateChange?: (stateMachineName: string, stateName: string) => void
}

type RiveComponentType = FC<RiveProps>

interface RiveInstance {
    play: () => void
    pause: () => void
    stop: () => void
}

interface StateMachineInput {
    value: boolean | number
    fire: () => void
}

type RiveOptions = RiveProps

export const useRive = jest.fn(
    (
        _options: RiveOptions
    ): { rive: RiveInstance | null; RiveComponent: RiveComponentType } => ({
        rive: {
            play: jest.fn(),
            pause: jest.fn(),
            stop: jest.fn(),
        },
        RiveComponent: jest.fn() as RiveComponentType,
    })
)

export const useStateMachineInput = jest.fn(
    (
        _rive: RiveInstance | null,
        _stateMachineName: string,
        _inputName: string
    ): StateMachineInput | null => ({
        value: false,
        fire: jest.fn(),
    })
)
