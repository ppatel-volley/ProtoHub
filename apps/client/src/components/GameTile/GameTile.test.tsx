import { fireEvent, render, screen } from "@testing-library/react"
import React from "react"

import { GameStatus } from "../../constants/game"
import type { Game } from "../../hooks/useGames"
import { GameTile } from "./GameTile"

jest.mock("../../config/envconfig", () => ({
    BASE_URL: "/mock-base-url/",
    getWindowVar: jest.fn(),
}))

jest.mock("../FocusableUI/FocusableItem", () => ({
    FocusableItem: jest.fn(
        ({
            children,
            onClick,
            onEnterPress,
            onFocus,
            onBlur,
            onAnimationEnd,
            focusable = true,
        }: {
            children: React.ReactNode
            onClick?: () => void
            onEnterPress?: () => void
            onFocus?: (element: HTMLDivElement) => void
            onBlur?: () => void
            onAnimationEnd?: (e: React.AnimationEvent<HTMLDivElement>) => void
            focusable?: boolean
        }) => (
            <div
                onClick={onClick}
                onKeyPress={onEnterPress}
                onFocus={(e) => onFocus?.(e.currentTarget)}
                onBlur={onBlur}
                onAnimationEnd={onAnimationEnd}
                data-focusable={focusable}
                data-testid="focusable-item"
            >
                {children}
            </div>
        )
    ),
}))

jest.mock("./StatusBanner", () => ({
    StatusBanner: jest.fn(({ status }: { status: string }) => (
        <div data-testid="mock-rive-component" data-status={status}>
            Status Banner
        </div>
    )),
}))

jest.mock("./TileAnimation", () => ({
    TileAnimation: jest.fn(() => null),
}))

describe("GameTile Component", () => {
    const mockOnFocus = jest.fn()
    const mockOnSelect = jest.fn()
    const mockOnPressStateChange = jest.fn()
    const MockTileAnimation = jest.requireMock("./TileAnimation")
        .TileAnimation as jest.Mock
    const mockGame: Game = {
        id: "jeopardy",
        title: "Jeopardy",
        tileImageUrl: "/jeopardy.avif",
        heroImageUrl: "/jeopardy-hero.avif",
        source: "placeholder" as const,
    }

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it("renders game tile without status banner when no status is provided", () => {
        render(
            <GameTile
                index={0}
                game={mockGame}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const gameTile = screen.getByRole("link")
        expect(gameTile).toBeInTheDocument()

        const gameImage = screen.getByRole("img")
        expect(gameImage).toHaveAttribute("src", "/jeopardy.avif")

        const statusBanner = screen.queryByTestId("mock-rive-component")
        expect(statusBanner).not.toBeInTheDocument()
    })

    it("renders game tile with coming-soon status banner", () => {
        const gameWithStatus: Game = {
            ...mockGame,
            status: GameStatus.ComingSoon,
        }

        render(
            <GameTile
                index={0}
                game={gameWithStatus}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const gameTile = screen.getByRole("link")
        expect(gameTile).toBeInTheDocument()

        const gameImage = screen.getByRole("img")
        expect(gameImage).toHaveAttribute("src", "/jeopardy.avif")

        const statusBanner = screen.getByTestId("mock-rive-component")
        expect(statusBanner).toBeInTheDocument()
        expect(statusBanner).toHaveAttribute("data-status", "coming-soon")
    })

    it("renders game tile with beta status banner", () => {
        const gameWithStatus: Game = {
            ...mockGame,
            status: GameStatus.Beta,
        }

        render(
            <GameTile
                index={0}
                game={gameWithStatus}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const gameTile = screen.getByRole("link")
        expect(gameTile).toBeInTheDocument()

        const gameImage = screen.getByRole("img")
        expect(gameImage).toHaveAttribute("src", "/jeopardy.avif")

        const statusBanner = screen.getByTestId("mock-rive-component")
        expect(statusBanner).toBeInTheDocument()
        expect(statusBanner).toHaveAttribute("data-status", "beta")
    })

    it("renders game tile with new status banner", () => {
        const gameWithStatus: Game = {
            ...mockGame,
            status: GameStatus.New,
        }

        render(
            <GameTile
                index={0}
                game={gameWithStatus}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const gameTile = screen.getByRole("link")
        expect(gameTile).toBeInTheDocument()

        const gameImage = screen.getByRole("img")
        expect(gameImage).toHaveAttribute("src", "/jeopardy.avif")

        const statusBanner = screen.getByTestId("mock-rive-component")
        expect(statusBanner).toBeInTheDocument()
        expect(statusBanner).toHaveAttribute("data-status", "new")
    })

    it("calls onFocus when game tile receives focus", () => {
        render(
            <GameTile
                index={0}
                game={mockGame}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const focusableItem = screen.getByRole("link").parentElement
        expect(focusableItem).not.toBeNull()

        if (!focusableItem) {
            throw new Error("Focusable item not found")
        }
        fireEvent.focus(focusableItem)
        expect(mockOnFocus).toHaveBeenCalled()
    })

    it("calls onSelect immediately when clicking a game tile", () => {
        render(
            <GameTile
                index={0}
                game={mockGame}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const gameTile = screen.getByRole("link")
        fireEvent.click(gameTile)

        expect(mockOnSelect).toHaveBeenCalled()
    })

    it("passes correct props to TileAnimation when animationUri is provided", () => {
        const gameWithAnimation: Game = {
            ...mockGame,
            animationUri: "/animation.avif",
        }

        render(
            <GameTile
                index={0}
                game={gameWithAnimation}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        expect(MockTileAnimation.mock.calls[0][0]).toEqual({
            isFocused: false,
            src: "/animation.avif",
            isCarouselActive: true,
        })

        const focusableItem = screen.getByRole("link").parentElement
        if (!focusableItem) {
            throw new Error("Focusable item not found")
        }
        fireEvent.focus(focusableItem)

        expect(MockTileAnimation.mock.calls[1][0]).toEqual({
            isFocused: true,
            src: "/animation.avif",
            isCarouselActive: true,
        })
    })

    it("is focusable when isCarouselActive is true", () => {
        render(
            <GameTile
                index={0}
                game={mockGame}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const focusableItem = screen.getByRole("link").parentElement
        expect(focusableItem).toHaveAttribute("data-focusable", "true")
    })

    it("is not focusable when isCarouselActive is false", () => {
        render(
            <GameTile
                index={0}
                game={mockGame}
                onFocus={mockOnFocus}
                onSelect={mockOnSelect}
                isCarouselActive={false}
                isPressed={false}
                onBlur={mockOnPressStateChange}
            />
        )

        const focusableItem = screen.getByRole("link").parentElement
        expect(focusableItem).toHaveAttribute("data-focusable", "false")
    })
})
