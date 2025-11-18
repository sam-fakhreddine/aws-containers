/**
 * Unit tests for useIsMounted hook
 * Tests component mount status tracking
 */

import { renderHook } from "@testing-library/react";
import { useIsMounted } from "../useIsMounted";

describe("useIsMounted", () => {
    describe("Mount status", () => {
        it("returns true when component is mounted", () => {
            const { result } = renderHook(() => useIsMounted());

            const isMounted = result.current();
            expect(isMounted).toBe(true);
        });

        it("returns false after component unmounts", () => {
            const { result, unmount } = renderHook(() => useIsMounted());

            expect(result.current()).toBe(true);

            unmount();

            expect(result.current()).toBe(false);
        });

        it("consistently returns true while mounted", () => {
            const { result, rerender } = renderHook(() => useIsMounted());

            expect(result.current()).toBe(true);

            // Re-render multiple times
            rerender();
            expect(result.current()).toBe(true);

            rerender();
            expect(result.current()).toBe(true);

            rerender();
            expect(result.current()).toBe(true);
        });
    });

    describe("Function identity", () => {
        it("returns a function", () => {
            const { result } = renderHook(() => useIsMounted());

            expect(typeof result.current).toBe("function");
        });

        it("function works consistently across renders", () => {
            const { result, rerender } = renderHook(() => useIsMounted());

            expect(result.current()).toBe(true);

            rerender();

            expect(result.current()).toBe(true);
        });
    });

    describe("Multiple instances", () => {
        it("tracks mount status independently for multiple hooks", () => {
            const { result: result1, unmount: unmount1 } = renderHook(() =>
                useIsMounted()
            );
            const { result: result2, unmount: unmount2 } = renderHook(() =>
                useIsMounted()
            );

            // Both should be mounted
            expect(result1.current()).toBe(true);
            expect(result2.current()).toBe(true);

            // Unmount first hook
            unmount1();

            // First should be unmounted, second still mounted
            expect(result1.current()).toBe(false);
            expect(result2.current()).toBe(true);

            // Unmount second hook
            unmount2();

            // Both should be unmounted
            expect(result1.current()).toBe(false);
            expect(result2.current()).toBe(false);
        });
    });

    describe("Real-world usage pattern", () => {
        it("prevents state updates on unmounted component", async () => {
            const { result, unmount } = renderHook(() => useIsMounted());

            // Simulate async operation
            const asyncOperation = async () => {
                await new Promise((resolve) => setTimeout(resolve, 100));

                // Check if still mounted before updating state
                if (result.current()) {
                    return "update state";
                }
                return "skip state update";
            };

            // Start operation
            const operationPromise = asyncOperation();

            // Unmount before operation completes
            unmount();

            // Operation should detect unmount
            const outcome = await operationPromise;
            expect(outcome).toBe("skip state update");
        });

        it("allows state updates when component remains mounted", async () => {
            const { result } = renderHook(() => useIsMounted());

            const asyncOperation = async () => {
                await new Promise((resolve) => setTimeout(resolve, 10));

                if (result.current()) {
                    return "update state";
                }
                return "skip state update";
            };

            const outcome = await asyncOperation();
            expect(outcome).toBe("update state");
        });
    });

    describe("Lifecycle", () => {
        it("sets mounted status to true on mount", () => {
            const { result } = renderHook(() => useIsMounted());

            expect(result.current()).toBe(true);
        });

        it("cleans up properly on unmount", () => {
            const { result, unmount } = renderHook(() => useIsMounted());

            unmount();

            // Should not throw error when called after unmount
            expect(() => result.current()).not.toThrow();
            expect(result.current()).toBe(false);
        });
    });

    describe("Edge cases", () => {
        it("handles rapid mount/unmount cycles", () => {
            for (let i = 0; i < 100; i++) {
                const { result, unmount } = renderHook(() => useIsMounted());

                expect(result.current()).toBe(true);
                unmount();
                expect(result.current()).toBe(false);
            }
        });

        it("handles multiple calls to isMounted function", () => {
            const { result } = renderHook(() => useIsMounted());

            // Call multiple times
            for (let i = 0; i < 10; i++) {
                expect(result.current()).toBe(true);
            }
        });

        it("returns consistent value when called repeatedly after unmount", () => {
            const { result, unmount } = renderHook(() => useIsMounted());

            unmount();

            // Call multiple times after unmount
            for (let i = 0; i < 10; i++) {
                expect(result.current()).toBe(false);
            }
        });
    });
});
