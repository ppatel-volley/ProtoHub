declare module "@rive-app/react-canvas" {
    import { FC, CSSProperties } from "react"

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

    interface RiveInstance {
        play: () => void
        pause: () => void
        stop: () => void
    }

    interface StateMachineInput {
        value: boolean | number
        fire: () => void
    }

    interface RiveOptions extends RiveProps {}

    export function useRive(options: RiveOptions): {
        rive: RiveInstance | null
        RiveComponent: FC<RiveProps>
    }

    export function useStateMachineInput(
        rive: RiveInstance | null,
        stateMachineName: string,
        inputName: string,
        initialValue?: number
    ): StateMachineInput | null
} 