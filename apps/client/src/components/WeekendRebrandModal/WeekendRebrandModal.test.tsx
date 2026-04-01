import { fireEvent, render, screen } from "@testing-library/react"
import { type JSX, type ReactNode } from "react"

import {
    WEEKEND_REBRAND_MODAL_BODY,
    WEEKEND_REBRAND_MODAL_BUTTON_TEXT,
    WEEKEND_REBRAND_MODAL_HEADING,
    WeekendRebrandModal,
} from "./WeekendRebrandModal"

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
    getWindowVar: jest.fn(),
}))

jest.mock("@noriginmedia/norigin-spatial-navigation", () => ({
    useFocusable: (): {
        ref: { current: null }
        focused: boolean
        focusSelf: jest.Mock
    } => ({
        ref: { current: null },
        focused: false,
        focusSelf: jest.fn(),
    }),
    FocusContext: {
        Provider: ({ children }: { children: ReactNode }): JSX.Element =>
            children as JSX.Element,
    },
}))

jest.mock("../UI/RiveButton", () => ({
    RiveButton: ({
        title,
        onClick,
    }: {
        title: string
        onClick: () => void
    }): JSX.Element => <button onClick={onClick}>{title}</button>,
}))

describe("WeekendRebrandModal", () => {
    const mockOnAcknowledge = jest.fn()

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("should not render when isOpen is false", () => {
        render(
            <WeekendRebrandModal
                isOpen={false}
                onAcknowledge={mockOnAcknowledge}
            />
        )

        expect(screen.queryByText(WEEKEND_REBRAND_MODAL_HEADING)).toBeNull()
    })

    it("should render heading when isOpen is true", () => {
        render(<WeekendRebrandModal isOpen onAcknowledge={mockOnAcknowledge} />)

        expect(
            screen.getByText(WEEKEND_REBRAND_MODAL_HEADING)
        ).toBeInTheDocument()
    })

    it("should render body text", () => {
        render(<WeekendRebrandModal isOpen onAcknowledge={mockOnAcknowledge} />)

        expect(screen.getByText(WEEKEND_REBRAND_MODAL_BODY)).toBeInTheDocument()
    })

    it("should render the Weekend logo image", () => {
        render(<WeekendRebrandModal isOpen onAcknowledge={mockOnAcknowledge} />)

        const logo = screen.getByAltText("Weekend")
        expect(logo).toBeInTheDocument()
        expect(logo).toHaveAttribute(
            "src",
            "/mock-base-url/assets/images/weekend-text.webp"
        )
    })

    it("should render the acknowledge button", () => {
        render(<WeekendRebrandModal isOpen onAcknowledge={mockOnAcknowledge} />)

        expect(
            screen.getByText(WEEKEND_REBRAND_MODAL_BUTTON_TEXT)
        ).toBeInTheDocument()
    })

    it("should call onAcknowledge when button is clicked", () => {
        render(<WeekendRebrandModal isOpen onAcknowledge={mockOnAcknowledge} />)

        fireEvent.click(screen.getByText(WEEKEND_REBRAND_MODAL_BUTTON_TEXT))

        expect(mockOnAcknowledge).toHaveBeenCalledTimes(1)
    })
})
