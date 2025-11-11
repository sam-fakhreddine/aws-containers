/**
 * Performance Testing Utilities
 *
 * Helper functions for measuring React component performance,
 * render counts, and execution timing.
 */

import { render as rtlRender, RenderResult } from '@testing-library/react';
import React from 'react';

/**
 * Render counter for tracking component re-renders
 */
export class RenderCounter {
    private counts: Map<string, number> = new Map();

    /**
     * Increment render count for a component
     */
    increment(componentName: string): void {
        const current = this.counts.get(componentName) || 0;
        this.counts.set(componentName, current + 1);
    }

    /**
     * Get render count for a component
     */
    getCount(componentName: string): number {
        return this.counts.get(componentName) || 0;
    }

    /**
     * Reset all counts
     */
    reset(): void {
        this.counts.clear();
    }

    /**
     * Get all counts
     */
    getAllCounts(): Record<string, number> {
        return Object.fromEntries(this.counts);
    }
}

/**
 * Create a ref that tracks renders
 */
export function useRenderCount(componentName: string, counter: RenderCounter): void {
    React.useEffect(() => {
        counter.increment(componentName);
    });
}

/**
 * Measure execution time of a function
 */
export async function measureExecutionTime<T>(
    fn: () => T | Promise<T>,
    label?: string
): Promise<{ result: T; timeMs: number }> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const timeMs = end - start;

    if (label) {
        console.log(`[Performance] ${label}: ${timeMs.toFixed(2)}ms`);
    }

    return { result, timeMs };
}

/**
 * Measure render time of a component
 */
export function measureRenderTime(
    component: React.ReactElement
): { container: RenderResult; timeMs: number } {
    const start = performance.now();
    const container = rtlRender(component);
    const end = performance.now();
    const timeMs = end - start;

    return { container, timeMs };
}

/**
 * Create mock profiles for performance testing
 */
export function createMockProfiles(count: number) {
    return Array.from({ length: count }, (_, i) => ({
        name: `test-profile-${i}`,
        expired: i % 5 === 0, // Every 5th profile is expired
        expiration: new Date(Date.now() + 3600000).toISOString(),
    }));
}

/**
 * Wait for a specific amount of time (for debouncing tests)
 */
export function waitFor(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Performance assertion helpers
 */
export const performanceAssertions = {
    /**
     * Assert that render count is below threshold
     */
    expectRenderCountBelow(actual: number, threshold: number, message?: string): void {
        if (actual >= threshold) {
            throw new Error(
                message || `Expected render count ${actual} to be below ${threshold}`
            );
        }
    },

    /**
     * Assert that execution time is below threshold
     */
    expectTimeBelow(actualMs: number, thresholdMs: number, message?: string): void {
        if (actualMs >= thresholdMs) {
            throw new Error(
                message || `Expected execution time ${actualMs}ms to be below ${thresholdMs}ms`
            );
        }
    },

    /**
     * Assert that render count improved (decreased)
     */
    expectRenderImprovement(before: number, after: number, message?: string): void {
        if (after >= before) {
            throw new Error(
                message || `Expected render count to improve from ${before} to less than ${before}, got ${after}`
            );
        }
    },
};

/**
 * Memory profiling utilities
 */
export const memoryProfile = {
    /**
     * Get current memory usage (if available)
     */
    getCurrentUsage(): number | null {
        if (typeof performance !== 'undefined' && (performance as any).memory) {
            return (performance as any).memory.usedJSHeapSize;
        }
        return null;
    },

    /**
     * Measure memory delta after function execution
     */
    async measureMemoryDelta<T>(fn: () => T | Promise<T>): Promise<{
        result: T;
        deltaBytes: number | null;
    }> {
        const before = this.getCurrentUsage();
        const result = await fn();
        const after = this.getCurrentUsage();

        const deltaBytes = before !== null && after !== null ? after - before : null;

        return { result, deltaBytes };
    },
};

/**
 * Batch operations for performance testing
 */
export async function runBatchOperations<T>(
    operation: () => T | Promise<T>,
    count: number,
    label?: string
): Promise<{ results: T[]; totalTimeMs: number; avgTimeMs: number }> {
    const results: T[] = [];
    const start = performance.now();

    for (let i = 0; i < count; i++) {
        results.push(await operation());
    }

    const end = performance.now();
    const totalTimeMs = end - start;
    const avgTimeMs = totalTimeMs / count;

    if (label) {
        console.log(
            `[Performance] ${label}: ${count} operations in ${totalTimeMs.toFixed(2)}ms (avg: ${avgTimeMs.toFixed(2)}ms)`
        );
    }

    return { results, totalTimeMs, avgTimeMs };
}
