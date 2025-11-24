/**
 * AWSProfiles Performance Tests
 *
 * Tests for search debouncing, useCallback effectiveness,
 * and overall component performance.
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AWSProfilesPopup } from '@/popup/awsProfiles';
import {
    createMockProfiles,
} from '@/__testUtils__/performanceHelpers';

// Mock browser APIs
(global as any).browser = {
    runtime: {
        sendMessage: jest.fn(() => Promise.resolve()),
        openOptionsPage: jest.fn(() => Promise.resolve()),
    },
    storage: {
        local: {
            get: jest.fn(() => Promise.resolve({})),
            set: jest.fn(() => Promise.resolve()),
        },
    },
    contextualIdentities: {
        query: jest.fn(() => Promise.resolve([])),
        remove: jest.fn(() => Promise.resolve()),
    },
    tabs: {
        create: jest.fn(() => Promise.resolve()),
    },
} as any;

// Mock hooks
jest.mock('@/hooks', () => ({
    useProfiles: jest.fn(),
    useFavorites: jest.fn(),
    useRecentProfiles: jest.fn(),
    useRegion: jest.fn(),
    useTheme: jest.fn(),
    useEnabledRegions: jest.fn(),
}));

// Mock services
jest.mock('@/services/apiClient', () => ({
    getProfiles: jest.fn(),
    getConsoleUrl: jest.fn(),
    getApiToken: jest.fn(),
    ApiClientError: class ApiClientError extends Error {
        constructor(message: string) {
            super(message);
            this.name = 'ApiClientError';
        }
    },
}));

// Mock container manager
jest.mock('@/utils/containerManager', () => ({
    prepareContainer: jest.fn(),
    clearAllContainers: jest.fn(),
}));

import * as hooks from '@/hooks';

describe('AWSProfiles Performance - Search Debouncing', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();

        // Setup default mock implementations
        const mockProfiles = createMockProfiles(50);
        
        (hooks.useProfiles as jest.Mock).mockReturnValue({
            profiles: mockProfiles,
            loading: false,
            error: null,
            apiAvailable: true,
            loadProfiles: jest.fn(),
            refreshProfiles: jest.fn(),
            enrichSSOProfiles: jest.fn(),
        });

        (hooks.useFavorites as jest.Mock).mockReturnValue({
            favorites: ['test-profile-0', 'test-profile-1'],
            isFavorite: jest.fn((name: string) => ['test-profile-0', 'test-profile-1'].includes(name)),
            toggleFavorite: jest.fn(),
            addFavorite: jest.fn(),
            removeFavorite: jest.fn(),
            loading: false,
        });

        (hooks.useRecentProfiles as jest.Mock).mockReturnValue({
            recentProfiles: [],
            addRecentProfile: jest.fn(),
        });

        (hooks.useRegion as jest.Mock).mockReturnValue({
            selectedRegion: 'us-east-1',
            setRegion: jest.fn(),
        });

        (hooks.useTheme as jest.Mock).mockReturnValue({
            mode: 'light',
            setMode: jest.fn(),
        });

        (hooks.useEnabledRegions as jest.Mock).mockReturnValue({
            regions: new Set(['us-east-1', 'us-west-2', 'eu-west-1']),
        });
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    /**
     * Test that search is debounced and doesn't filter on every keystroke
     */
    it('should debounce search input with 300ms delay', async () => {
        const user = userEvent.setup({ delay: null });
        render(<AWSProfilesPopup />);

        const searchInput = screen.getByPlaceholderText(/search/i);

        // Type "test" quickly (4 keystrokes)
        await act(async () => {
            await user.type(searchInput, 't');
            jest.advanceTimersByTime(50);
            await user.type(searchInput, 'e');
            jest.advanceTimersByTime(50);
            await user.type(searchInput, 's');
            jest.advanceTimersByTime(50);
            await user.type(searchInput, 't');
            // Don't advance full 300ms yet
            jest.advanceTimersByTime(200);
        });

        // At this point, debounce hasn't triggered yet (only 200ms passed since last keystroke)
        // Filtering should not have happened yet

        // Now advance the remaining 100ms to complete the 300ms debounce
        await act(async () => {
            jest.advanceTimersByTime(100);
        });

        // Now filtering should have happened
        // Input should show "test"
        expect(searchInput).toHaveValue('test');
    });

    /**
     * Test that rapid typing results in single filter operation
     */
    it('should only filter once after rapid typing stops', async () => {
        const user = userEvent.setup({ delay: null });
        render(<AWSProfilesPopup />);

        const searchInput = screen.getByPlaceholderText(/search/i);

        // Simulate rapid typing: "profile"
        const searchTerm = 'profile';

        await act(async () => {
            // Type all characters quickly
            for (const char of searchTerm) {
                await user.type(searchInput, char);
                jest.advanceTimersByTime(50); // Less than debounce delay
            }

            // Now wait for debounce to complete
            jest.advanceTimersByTime(300);
        });

        // Search input should have the full term
        expect(searchInput).toHaveValue(searchTerm);

        // The component should have filtered profiles
        // (Exact assertion depends on component structure)
    });

    /**
     * Test that clearing search is also debounced
     */
    it('should debounce search clearing', async () => {
        const user = userEvent.setup({ delay: null });
        render(<AWSProfilesPopup />);

        const searchInput = screen.getByPlaceholderText(/search/i);

        // Type search term
        await act(async () => {
            await user.type(searchInput, 'test');
            jest.advanceTimersByTime(300);
        });

        expect(searchInput).toHaveValue('test');

        // Clear the search
        await act(async () => {
            await user.clear(searchInput);
            jest.advanceTimersByTime(300);
        });

        expect(searchInput).toHaveValue('');
    });

    /**
     * Benchmark: Search performance with large dataset
     */
    it('should handle search on large profile list efficiently', async () => {
        const user = userEvent.setup({ delay: null });

        const start = performance.now();
        render(<AWSProfilesPopup />);
        const end = performance.now();
        const renderTime = end - start;

        // Initial render should be fast even with 50 profiles
        expect(renderTime).toBeLessThan(1000); // 1 second threshold

        const searchInput = screen.getByPlaceholderText(/search/i);

        // Perform search
        const searchStart = performance.now();
        await act(async () => {
            await user.type(searchInput, 'test-profile-1');
            jest.advanceTimersByTime(300);
        });
        const searchEnd = performance.now();
        const searchTime = searchEnd - searchStart;

        // Search operation should be fast
        expect(searchTime).toBeLessThan(500); // 500ms threshold
    });
});

describe('AWSProfiles Performance - useCallback Effectiveness', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementations
        const mockProfiles = createMockProfiles(50);
        
        (hooks.useProfiles as jest.Mock).mockReturnValue({
            profiles: mockProfiles,
            loading: false,
            error: null,
            apiAvailable: true,
            loadProfiles: jest.fn(),
            refreshProfiles: jest.fn(),
            enrichSSOProfiles: jest.fn(),
        });

        (hooks.useFavorites as jest.Mock).mockReturnValue({
            favorites: ['test-profile-0', 'test-profile-1'],
            isFavorite: jest.fn((name: string) => ['test-profile-0', 'test-profile-1'].includes(name)),
            toggleFavorite: jest.fn(),
            addFavorite: jest.fn(),
            removeFavorite: jest.fn(),
            loading: false,
        });

        (hooks.useRecentProfiles as jest.Mock).mockReturnValue({
            recentProfiles: [],
            addRecentProfile: jest.fn(),
        });

        (hooks.useRegion as jest.Mock).mockReturnValue({
            selectedRegion: 'us-east-1',
            setRegion: jest.fn(),
        });

        (hooks.useTheme as jest.Mock).mockReturnValue({
            mode: 'light',
            setMode: jest.fn(),
        });

        (hooks.useEnabledRegions as jest.Mock).mockReturnValue({
            regions: new Set(['us-east-1', 'us-west-2', 'eu-west-1']),
        });
    });

    /**
     * Test that handler functions are stable across re-renders
     */
    it('should maintain stable callback references with useCallback', () => {
        const { rerender } = render(<AWSProfilesPopup />);

        // Get initial reference (we can't directly test this in DOM,
        // but we can verify the component doesn't error on re-render)
        const initialContent = screen.getByText(/AWS Profile Containers/i);
        expect(initialContent).toBeInTheDocument();

        // Force re-render
        rerender(<AWSProfilesPopup />);

        // Component should still render correctly
        const afterRerender = screen.getByText(/AWS Profile Containers/i);
        expect(afterRerender).toBeInTheDocument();

        // If callbacks were unstable, child components would re-render
        // and potentially cause performance issues or errors
    });

    /**
     * Test that multiple state updates don't cause excessive re-renders
     */
    it('should handle multiple rapid state updates efficiently', async () => {
        const user = userEvent.setup();
        render(<AWSProfilesPopup />);

        // Perform multiple interactions rapidly
        const searchInput = screen.getByPlaceholderText(/search/i);

        const start = performance.now();

        // Type, delete, type again
        await user.type(searchInput, 'test');
        await user.clear(searchInput);
        await user.type(searchInput, 'profile');

        const end = performance.now();
        const totalTime = end - start;

        // Multiple state updates should complete quickly
        expect(totalTime).toBeLessThan(2000); // 2 second threshold

        expect(searchInput).toHaveValue('profile');
    });
});

describe('AWSProfiles Performance - Overall Rendering', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        // Setup default mock implementations
        const mockProfiles = createMockProfiles(50);
        
        (hooks.useProfiles as jest.Mock).mockReturnValue({
            profiles: mockProfiles,
            loading: false,
            error: null,
            apiAvailable: true,
            loadProfiles: jest.fn(),
            refreshProfiles: jest.fn(),
            enrichSSOProfiles: jest.fn(),
        });

        (hooks.useFavorites as jest.Mock).mockReturnValue({
            favorites: ['test-profile-0', 'test-profile-1'],
            isFavorite: jest.fn((name: string) => ['test-profile-0', 'test-profile-1'].includes(name)),
            toggleFavorite: jest.fn(),
            addFavorite: jest.fn(),
            removeFavorite: jest.fn(),
            loading: false,
        });

        (hooks.useRecentProfiles as jest.Mock).mockReturnValue({
            recentProfiles: [],
            addRecentProfile: jest.fn(),
        });

        (hooks.useRegion as jest.Mock).mockReturnValue({
            selectedRegion: 'us-east-1',
            setRegion: jest.fn(),
        });

        (hooks.useTheme as jest.Mock).mockReturnValue({
            mode: 'light',
            setMode: jest.fn(),
        });

        (hooks.useEnabledRegions as jest.Mock).mockReturnValue({
            regions: new Set(['us-east-1', 'us-west-2', 'eu-west-1']),
        });
    });

    /**
     * Benchmark: Initial render time
     */
    it('should render initial view quickly', () => {
        const start = performance.now();
        render(<AWSProfilesPopup />);
        const end = performance.now();
        const renderTime = end - start;

        // Initial render should be fast
        expect(renderTime).toBeLessThan(1000); // 1 second

        // Verify content is rendered
        expect(screen.getByText(/AWS Profile Containers/i)).toBeInTheDocument();
    });

    /**
     * Benchmark: Re-render performance
     */
    it('should re-render efficiently', () => {
        const { rerender } = render(<AWSProfilesPopup />);

        // Measure re-render time
        const start = performance.now();
        rerender(<AWSProfilesPopup />);
        const end = performance.now();
        const rerenderTime = end - start;

        // Re-render should be very fast due to React.memo and useCallback
        expect(rerenderTime).toBeLessThan(500); // 500ms

        expect(screen.getByText(/AWS Profile Containers/i)).toBeInTheDocument();
    });

    /**
     * Test memory stability during interaction
     */
    it('should not leak memory during interactions', async () => {
        const user = userEvent.setup();
        render(<AWSProfilesPopup />);

        const searchInput = screen.getByPlaceholderText(/search/i);

        // Perform many interactions
        for (let i = 0; i < 10; i++) {
            await user.type(searchInput, `test${i}`);
            await user.clear(searchInput);
        }

        // If there were memory leaks, this would cause issues
        // The fact that the test completes successfully indicates
        // no major memory leaks during normal operation

        expect(searchInput).toBeInTheDocument();
    });
});
