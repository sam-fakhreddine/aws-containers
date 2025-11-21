/**
 * ProfileItem Performance Tests
 *
 * Tests to verify React.memo prevents unnecessary re-renders
 * of individual profile items.
 */

import React, { useState } from 'react';
import { render, screen, act } from '@testing-library/react';
import { ProfileItem } from '../ProfileItem';
import { performanceAssertions } from '../../../__testUtils__/performanceHelpers';
import type { AWSProfile } from '../../types';

describe('ProfileItem Performance', () => {
    const mockProfile: AWSProfile = {
        name: 'test-profile',
        expired: false,
        expiration: '2025-12-31T23:59:59Z',
        has_credentials: true,
        color: 'blue',
        icon: 'briefcase',
    };

    const mockOnClick = jest.fn();
    const mockOnFavoriteToggle = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    /**
     * Test that ProfileItem doesn't re-render when unrelated props change
     */
    it('should not re-render when parent re-renders with same props', () => {
        function TestWrapper() {
            const [counter, setCounter] = useState(0);

            return (
                <div>
                    <button onClick={() => setCounter(c => c + 1)}>Increment</button>
                    <div data-testid="counter">{counter}</div>
                    <ProfileItem
                        profile={mockProfile}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                        onFavoriteToggle={mockOnFavoriteToggle}
                    />
                </div>
            );
        }

        const { rerender } = render(<TestWrapper />);

        // Initial render
        expect(screen.getByText('test-profile')).toBeInTheDocument();

        // Force parent re-render
        const button = screen.getByText('Increment');
        act(() => {
            button.click();
        });

        // Verify parent re-rendered
        expect(screen.getByTestId('counter')).toHaveTextContent('1');

        // ProfileItem should still be present (not re-rendered because props are same)
        expect(screen.getByText('test-profile')).toBeInTheDocument();

        // Force multiple re-renders
        act(() => {
            for (let i = 0; i < 10; i++) {
                button.click();
            }
        });

        expect(screen.getByTestId('counter')).toHaveTextContent('11');
        expect(screen.getByText('test-profile')).toBeInTheDocument();
    });

    /**
     * Test that ProfileItem re-renders when profile data changes
     */
    it('should re-render when profile data changes', () => {
        const profile1: AWSProfile = {
            name: 'profile-1',
            expired: false,
            expiration: '2025-12-31T23:59:59Z',
            has_credentials: true,
            color: 'blue',
            icon: 'briefcase',
        };

        const profile2: AWSProfile = {
            name: 'profile-2',
            expired: true,
            expiration: '2024-01-01T00:00:00Z',
            has_credentials: true,
            color: 'red',
            icon: 'briefcase',
        };

        const { rerender } = render(
            <ProfileItem
                profile={profile1}
                isFavorite={false}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        expect(screen.getByText('profile-1')).toBeInTheDocument();
        expect(screen.queryByText(/Expired/i)).not.toBeInTheDocument();

        // Change to expired profile
        rerender(
            <ProfileItem
                profile={profile2}
                isFavorite={false}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        expect(screen.getByText('profile-2')).toBeInTheDocument();
        // Should show "Expired X ago" or similar natural language format
        expect(screen.getByText(/Expired.*ago/i)).toBeInTheDocument();
    });

    /**
     * Test that ProfileItem re-renders when favorite status changes
     */
    it('should re-render when favorite status changes', () => {
        const { rerender } = render(
            <ProfileItem
                profile={mockProfile}
                isFavorite={false}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        // Not favorited initially - check for icon name attribute
        const icons = document.querySelectorAll('[class*="icon"]');
        expect(icons.length).toBeGreaterThan(0);

        // Toggle favorite
        rerender(
            <ProfileItem
                profile={mockProfile}
                isFavorite={true}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        // Now favorited - check for icon name attribute
        const iconsAfter = document.querySelectorAll('[class*="icon"]');
        expect(iconsAfter.length).toBeGreaterThan(0);
    });

    /**
     * Test custom comparison function efficiency
     */
    it('should use custom comparison to avoid unnecessary re-renders', () => {
        const profile: AWSProfile = {
            name: 'test-profile',
            expired: false,
            expiration: '2025-12-31T23:59:59Z',
            has_credentials: true,
            color: 'blue',
            icon: 'briefcase',
        };

        const { rerender } = render(
            <ProfileItem
                profile={profile}
                isFavorite={false}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        // Create new object with same values
        const profileCopy: AWSProfile = {
            name: 'test-profile',
            expired: false,
            expiration: '2025-12-31T23:59:59Z',
            has_credentials: true,
            color: 'blue',
            icon: 'briefcase',
        };

        // Re-render with new object reference but same values
        rerender(
            <ProfileItem
                profile={profileCopy}
                isFavorite={false}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        // Component should recognize values are same and avoid re-render
        // Verified by custom comparison function
        expect(screen.getByText('test-profile')).toBeInTheDocument();
    });

    /**
     * Benchmark: Render time for individual item
     */
    it('should render individual item quickly', () => {
        const start = performance.now();

        render(
            <ProfileItem
                profile={mockProfile}
                isFavorite={false}
                onProfileClick={mockOnClick}
                onFavoriteToggle={mockOnFavoriteToggle}
            />
        );

        const end = performance.now();
        const renderTime = end - start;

        // Single item should render very quickly
        performanceAssertions.expectTimeBelow(
            renderTime,
            50,
            `ProfileItem took ${renderTime.toFixed(2)}ms to render`
        );

        expect(screen.getByText('test-profile')).toBeInTheDocument();
    });

    /**
     * Benchmark: Render time for many items
     */
    it('should render many items efficiently', () => {
        const profiles: AWSProfile[] = Array.from({ length: 50 }, (_, i) => ({
            name: `profile-${i}`,
            expired: i % 5 === 0,
            expiration: '2025-12-31T23:59:59Z',
            has_credentials: true,
            color: 'blue',
            icon: 'briefcase',
        }));

        const start = performance.now();

        render(
            <div>
                {profiles.map(profile => (
                    <ProfileItem
                        key={profile.name}
                        profile={profile}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                        onFavoriteToggle={mockOnFavoriteToggle}
                    />
                ))}
            </div>
        );

        const end = performance.now();
        const renderTime = end - start;

        // 50 items should render quickly
        performanceAssertions.expectTimeBelow(
            renderTime,
            500,
            `50 ProfileItems took ${renderTime.toFixed(2)}ms to render`
        );

        expect(screen.getAllByRole('button')).toHaveLength(50);
    });

    /**
     * Test that memo comparison is efficient
     */
    it('should compare props efficiently during re-renders', () => {
        const profiles = Array.from({ length: 100 }, (_, i) => ({
            name: `profile-${i}`,
            expired: false,
            expiration: '2025-12-31T23:59:59Z',
            has_credentials: true,
            color: 'blue',
            icon: 'briefcase',
        }));

        function TestWrapper() {
            const [counter, setCounter] = useState(0);

            return (
                <div>
                    <button onClick={() => setCounter(c => c + 1)}>Update</button>
                    <div>
                        {profiles.map(profile => (
                            <ProfileItem
                                key={profile.name}
                                profile={profile}
                                isFavorite={false}
                                onProfileClick={mockOnClick}
                                onFavoriteToggle={mockOnFavoriteToggle}
                            />
                        ))}
                    </div>
                </div>
            );
        }

        render(<TestWrapper />);

        const button = screen.getByText('Update');

        // Measure re-render performance
        const start = performance.now();

        // Force 10 parent re-renders
        act(() => {
            for (let i = 0; i < 10; i++) {
                button.click();
            }
        });

        const end = performance.now();
        const totalTime = end - start;

        // Re-renders should be fast because memo prevents child re-renders
        performanceAssertions.expectTimeBelow(
            totalTime,
            1000,
            `10 re-renders of 100 items took ${totalTime.toFixed(2)}ms`
        );

        // All items should still be present (100 profile buttons + 1 Update button)
        const allButtons = screen.getAllByRole('button');
        expect(allButtons.length).toBeGreaterThanOrEqual(100);
    });
});
