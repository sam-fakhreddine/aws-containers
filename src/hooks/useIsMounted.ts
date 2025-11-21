/**
 * Custom hook to track component mount status
 * Prevents state updates on unmounted components
 */

import { useCallback, useEffect, useRef } from "react";

/**
 * Hook that returns a function to check if component is still mounted
 * @returns Function that returns true if component is mounted
 */
export function useIsMounted(): () => boolean {
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
        };
    }, []);

    return useCallback(() => isMountedRef.current, []);
}
