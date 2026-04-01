import { createContext, useContext } from "react"

/**
 * Creates a typed React context with a useTypedContext hook that throws if used outside the Provider.
 */
export function createTypedContext<T>(
    displayName: string
): [React.Context<T | null>, () => T] {
    const Context = createContext<T | null>(null)
    Context.displayName = displayName

    const useTypedContext = (): T => {
        const value = useContext(Context)
        if (value === null) {
            throw new Error(
                `${displayName} context must be used within its Provider`
            )
        }
        return value
    }

    return [Context, useTypedContext]
}
