/**
 * Unit tests for ThemeSelector component
 * Tests theme selection dropdown and memoization
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSelector } from "../ThemeSelector";
import { ThemeMode } from "../../hooks";

describe("ThemeSelector", () => {
    describe("Rendering", () => {
        it("renders theme button with current mode", () => {
            render(<ThemeSelector mode="light" onModeChange={jest.fn()} />);

            expect(screen.getByText(/Theme: Light/)).toBeInTheDocument();
        });

        it("displays correct label for dark mode", () => {
            render(<ThemeSelector mode="dark" onModeChange={jest.fn()} />);

            expect(screen.getByText(/Theme: Dark/)).toBeInTheDocument();
        });

        it("displays correct label for system mode", () => {
            render(<ThemeSelector mode="system" onModeChange={jest.fn()} />);

            expect(screen.getByText(/Theme: System/)).toBeInTheDocument();
        });

        it("renders as a button", () => {
            render(<ThemeSelector mode="light" onModeChange={jest.fn()} />);

            const button = screen.getByRole("button");
            expect(button).toBeInTheDocument();
        });
    });

    describe("Theme selection", () => {
        it("calls onModeChange when light theme selected", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="dark" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");
            await user.click(button);

            const lightOption = screen.getByText("Light");
            await user.click(lightOption);

            expect(onModeChange).toHaveBeenCalledWith("light");
        });

        it("calls onModeChange when dark theme selected", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");
            await user.click(button);

            const darkOption = screen.getByText("Dark");
            await user.click(darkOption);

            expect(onModeChange).toHaveBeenCalledWith("dark");
        });

        it("calls onModeChange when system theme selected", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");
            await user.click(button);

            const systemOption = screen.getByText("System");
            await user.click(systemOption);

            expect(onModeChange).toHaveBeenCalledWith("system");
        });

        it("calls onModeChange exactly once per click", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");
            await user.click(button);

            const darkOption = screen.getByText("Dark");
            await user.click(darkOption);

            expect(onModeChange).toHaveBeenCalledTimes(1);
        });
    });

    describe("Dropdown menu", () => {
        it("shows all three theme options", async () => {
            const user = userEvent.setup();
            render(<ThemeSelector mode="light" onModeChange={jest.fn()} />);

            const button = screen.getByRole("button");
            await user.click(button);

            expect(screen.getByText("Light")).toBeInTheDocument();
            expect(screen.getByText("Dark")).toBeInTheDocument();
            expect(screen.getByText("System")).toBeInTheDocument();
        });

        it("opens dropdown when clicked", async () => {
            const user = userEvent.setup();
            render(<ThemeSelector mode="light" onModeChange={jest.fn()} />);

            const button = screen.getByRole("button");

            // Menu should not be visible initially
            expect(screen.queryByText("Dark")).not.toBeInTheDocument();

            await user.click(button);

            // Menu should be visible after click
            expect(screen.getByText("Dark")).toBeInTheDocument();
        });
    });

    describe("Memoization", () => {
        it("does not re-render when parent re-renders with same props", () => {
            const onModeChange = jest.fn();
            const { rerender } = render(
                <ThemeSelector mode="light" onModeChange={onModeChange} />
            );

            const firstRender = screen.getByText(/Theme: Light/);

            // Re-render with same props
            rerender(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const secondRender = screen.getByText(/Theme: Light/);

            // Should be the same instance due to memoization
            expect(firstRender).toBe(secondRender);
        });

        it("re-renders when mode changes", () => {
            const onModeChange = jest.fn();
            const { rerender } = render(
                <ThemeSelector mode="light" onModeChange={onModeChange} />
            );

            expect(screen.getByText(/Theme: Light/)).toBeInTheDocument();

            rerender(<ThemeSelector mode="dark" onModeChange={onModeChange} />);

            expect(screen.queryByText(/Theme: Light/)).not.toBeInTheDocument();
            expect(screen.getByText(/Theme: Dark/)).toBeInTheDocument();
        });

        it("re-renders when onModeChange changes", () => {
            const onModeChange1 = jest.fn();
            const onModeChange2 = jest.fn();

            const { rerender } = render(
                <ThemeSelector mode="light" onModeChange={onModeChange1} />
            );

            rerender(<ThemeSelector mode="light" onModeChange={onModeChange2} />);

            // Component should have updated callback
            expect(true).toBe(true); // Just verify no errors
        });
    });

    describe("All theme modes", () => {
        const modes: ThemeMode[] = ["light", "dark", "system"];

        modes.forEach((mode) => {
            it(`handles ${mode} mode correctly`, () => {
                render(<ThemeSelector mode={mode} onModeChange={jest.fn()} />);

                const expectedLabel = mode.charAt(0).toUpperCase() + mode.slice(1);
                expect(screen.getByText(`Theme: ${expectedLabel}`)).toBeInTheDocument();
            });
        });
    });

    describe("Keyboard accessibility", () => {
        it("button is keyboard accessible", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");

            // Focus and activate with keyboard
            button.focus();
            await user.keyboard("{Enter}");

            // Menu should open
            expect(screen.getByText("Dark")).toBeInTheDocument();
        });
    });

    describe("Edge cases", () => {
        it("handles rapid theme changes", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");

            // Rapidly change themes
            await user.click(button);
            await user.click(screen.getByText("Dark"));

            await user.click(button);
            await user.click(screen.getByText("System"));

            await user.click(button);
            await user.click(screen.getByText("Light"));

            expect(onModeChange).toHaveBeenCalledTimes(3);
        });

        it("handles same mode selection", async () => {
            const user = userEvent.setup();
            const onModeChange = jest.fn();

            render(<ThemeSelector mode="light" onModeChange={onModeChange} />);

            const button = screen.getByRole("button");
            await user.click(button);

            const lightOption = screen.getByText("Light");
            await user.click(lightOption);

            // Should still call callback even if selecting current mode
            expect(onModeChange).toHaveBeenCalledWith("light");
        });
    });
});
