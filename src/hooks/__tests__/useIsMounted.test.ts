/**
 * Tests for useIsMounted hook
 * Verifies performance optimization: stable function reference
 */

import { renderHook } from "@testing-library/react";
import { useIsMounted } from "../useIsMounted";

describe("useIsMounted", () => {
    it("should return a function that checks mount status", () => {
        const { result } = renderHook(() => useIsMounted());
        
        expect(typeof result.current).toBe("function");
        expect(result.current()).toBe(true);
    });

    it("should return false after component unmounts", () => {
        const { result, unmount } = renderHook(() => useIsMounted());
        
        const isMounted = result.current;
        expect(isMounted()).toBe(true);
        
        unmount();
        expect(isMounted()).toBe(false);
    });

    it("should maintain stable function reference across renders (performance optimization)", () => {
        const { result, rerender } = renderHook(() => useIsMounted());
        
        const firstReference = result.current;
        
        // Force multiple re-renders
        rerender();
        rerender();
        rerender();
        
        const secondReference = result.current;
        
        // The function reference should be the same (useCallback optimization)
        expect(firstReference).toBe(secondReference);
    });

    it("should correctly track mount status across multiple renders", () => {
        const { result, rerender } = renderHook(() => useIsMounted());
        
        expect(result.current()).toBe(true);
        
        rerender();
        expect(result.current()).toBe(true);
        
        rerender();
        expect(result.current()).toBe(true);
    });
});
