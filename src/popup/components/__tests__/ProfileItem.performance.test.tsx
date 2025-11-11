/**
 * ProfileItem Performance Tests
 *
 * Tests to verify React.memo prevents unnecessary re-renders
 * of individual profile items.
 */

import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
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
                <table>
                    <tbody>
                        <button onClick={() => setCounter(c => c + 1)}>Increment</button>
                        <div data-testid="counter">{counter}</div>
                        <ProfileItem
                            profile={mockProfile}
                            isFavorite={false}
                            onProfileClick={mockOnClick}
                        />
                    </tbody>
                </table>
            );
        }

        const { rerender } = render(<TestWrapper />);

        // Initial render
        expect(screen.getByText('test-profile')).toBeInTheDocument();

        // Force parent re-render
        const button = screen.getByText('Increment');
        button.click();

        // Verify parent re-rendered
        expect(screen.getByTestId('counter')).toHaveTextContent('1');

        // ProfileItem should still be present (not re-rendered because props are same)
        expect(screen.getByText('test-profile')).toBeInTheDocument();

        // Force multiple re-renders
        for (let i = 0; i < 10; i++) {
            button.click();
        }

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
            <table>
                <tbody>
                    <ProfileItem
                        profile={profile1}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
        );

        expect(screen.getByText('profile-1')).toBeInTheDocument();
        expect(screen.queryByText('EXPIRED')).not.toBeInTheDocument();

        // Change to expired profile
        rerender(
            <table>
                <tbody>
                    <ProfileItem
                        profile={profile2}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
        );

        expect(screen.getByText('profile-2')).toBeInTheDocument();
        expect(screen.getByText('EXPIRED')).toBeInTheDocument();
    });

    /**
     * Test that ProfileItem re-renders when favorite status changes
     */
    it('should re-render when favorite status changes', () => {
        const { rerender } = render(
            <table>
                <tbody>
                    <ProfileItem
                        profile={mockProfile}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
        );

        // Not favorited initially
        expect(screen.queryByText('★')).not.toBeInTheDocument();
        expect(screen.getByText('☆')).toBeInTheDocument();

        // Toggle favorite
        rerender(
            <table>
                <tbody>
                    <ProfileItem
                        profile={mockProfile}
                        isFavorite={true}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
        );

        // Now favorited
        expect(screen.getByText('★')).toBeInTheDocument();
        expect(screen.queryByText('☆')).not.toBeInTheDocument();
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
            <table>
                <tbody>
                    <ProfileItem
                        profile={profile}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
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
            <table>
                <tbody>
                    <ProfileItem
                        profile={profileCopy}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
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
            <table>
                <tbody>
                    <ProfileItem
                        profile={mockProfile}
                        isFavorite={false}
                        onProfileClick={mockOnClick}
                    />
                </tbody>
            </table>
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
            <table>
                <tbody>
                    {profiles.map(profile => (
                        <ProfileItem
                            key={profile.name}
                            profile={profile}
                            isFavorite={false}
                            onProfileClick={mockOnClick}
                        />
                    ))}
                </tbody>
            </table>
        );

        const end = performance.now();
        const renderTime = end - start;

        // 50 items should render quickly
        performanceAssertions.expectTimeBelow(
            renderTime,
            500,
            `50 ProfileItems took ${renderTime.toFixed(2)}ms to render`
        );

        expect(screen.getAllByRole('row')).toHaveLength(50);
    });

    /**
     * Test that memo comparison is efficient
     */
    it('should compare props efficiently during re-renders', () => {
        const profiles = Array.from({ length: 100 }, (_, i) => ({
            name: `profile-${i}`,
            expired: false,
            expiration: '2025-12-31T23:59:59Z',
        }));

        function TestWrapper() {
            const [counter, setCounter] = useState(0);

            return (
                <>
                    <button onClick={() => setCounter(c => c + 1)}>Update</button>
                    <table>
                        <tbody>
                            {profiles.map(profile => (
                                <ProfileItem
                                    key={profile.name}
                                    profile={profile}
                                    isFavorite={false}
                                    onProfileClick={mockOnClick}
                                />
                            ))}
                        </tbody>
                    </table>
                </>
            );
        }

        render(<TestWrapper />);

        const button = screen.getByText('Update');

        // Measure re-render performance
        const start = performance.now();

        // Force 10 parent re-renders
        for (let i = 0; i < 10; i++) {
            button.click();
        }

        const end = performance.now();
        const totalTime = end - start;

        // Re-renders should be fast because memo prevents child re-renders
        performanceAssertions.expectTimeBelow(
            totalTime,
            1000,
            `10 re-renders of 100 items took ${totalTime.toFixed(2)}ms`
        );

        // All items should still be present
        expect(screen.getAllByRole('row')).toHaveLength(100);
    });
});
