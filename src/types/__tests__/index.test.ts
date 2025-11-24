/**
 * Tests for type guards and validators
 */

import {
    isProfileListResponse,
    isConsoleUrlResponse,
    isErrorResponse,
    isNativeMessagingResponse,
    isStringArray,
    isAWSProfile,
    isAWSProfileArray,
    isStorageData,
    type AWSProfile,
    type ProfileListResponse,
    type ConsoleUrlResponse,
    type ErrorResponse,
    type StorageData,
} from '@/types';

describe('Type Guards', () => {
    describe('isProfileListResponse', () => {
        it('should return true for valid ProfileListResponse', () => {
            const validResponse: ProfileListResponse = {
                action: 'profileList',
                profiles: [
                    {
                        name: 'test-profile',
                        has_credentials: true,
                        expiration: null,
                        expired: false,
                        color: 'blue',
                        icon: 'fingerprint',
                    },
                ],
            };

            expect(isProfileListResponse(validResponse)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isProfileListResponse(null)).toBe(false);
        });

        it('should return false for undefined', () => {
            expect(isProfileListResponse(undefined)).toBe(false);
        });

        it('should return false for non-object', () => {
            expect(isProfileListResponse('string')).toBe(false);
            expect(isProfileListResponse(123)).toBe(false);
            expect(isProfileListResponse(true)).toBe(false);
        });

        it('should return false for object without action', () => {
            expect(isProfileListResponse({ profiles: [] })).toBe(false);
        });

        it('should return false for object with wrong action', () => {
            expect(isProfileListResponse({ action: 'wrongAction', profiles: [] })).toBe(false);
        });

        it('should return false for object without profiles', () => {
            expect(isProfileListResponse({ action: 'profileList' })).toBe(false);
        });

        it('should return false for object with non-array profiles', () => {
            expect(isProfileListResponse({ action: 'profileList', profiles: 'not-array' })).toBe(false);
        });
    });

    describe('isConsoleUrlResponse', () => {
        it('should return true for valid ConsoleUrlResponse', () => {
            const validResponse: ConsoleUrlResponse = {
                action: 'consoleUrl',
                url: 'https://console.aws.amazon.com',
                profileName: 'test-profile',
                color: 'blue',
                icon: 'fingerprint',
            };

            expect(isConsoleUrlResponse(validResponse)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isConsoleUrlResponse(null)).toBe(false);
        });

        it('should return false for object with wrong action', () => {
            expect(isConsoleUrlResponse({
                action: 'wrongAction',
                url: 'https://example.com',
                profileName: 'test',
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string url', () => {
            expect(isConsoleUrlResponse({
                action: 'consoleUrl',
                url: 123,
                profileName: 'test',
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string profileName', () => {
            expect(isConsoleUrlResponse({
                action: 'consoleUrl',
                url: 'https://example.com',
                profileName: 123,
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string color', () => {
            expect(isConsoleUrlResponse({
                action: 'consoleUrl',
                url: 'https://example.com',
                profileName: 'test',
                color: 123,
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string icon', () => {
            expect(isConsoleUrlResponse({
                action: 'consoleUrl',
                url: 'https://example.com',
                profileName: 'test',
                color: 'blue',
                icon: 123,
            })).toBe(false);
        });
    });

    describe('isErrorResponse', () => {
        it('should return true for valid ErrorResponse', () => {
            const validResponse: ErrorResponse = {
                action: 'error',
                message: 'Something went wrong',
            };

            expect(isErrorResponse(validResponse)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isErrorResponse(null)).toBe(false);
        });

        it('should return false for object with wrong action', () => {
            expect(isErrorResponse({ action: 'wrongAction', message: 'error' })).toBe(false);
        });

        it('should return false for object with non-string message', () => {
            expect(isErrorResponse({ action: 'error', message: 123 })).toBe(false);
        });

        it('should return false for object without message', () => {
            expect(isErrorResponse({ action: 'error' })).toBe(false);
        });
    });

    describe('isNativeMessagingResponse', () => {
        it('should return true for ProfileListResponse', () => {
            const response: ProfileListResponse = {
                action: 'profileList',
                profiles: [],
            };

            expect(isNativeMessagingResponse(response)).toBe(true);
        });

        it('should return true for ConsoleUrlResponse', () => {
            const response: ConsoleUrlResponse = {
                action: 'consoleUrl',
                url: 'https://example.com',
                profileName: 'test',
                color: 'blue',
                icon: 'fingerprint',
            };

            expect(isNativeMessagingResponse(response)).toBe(true);
        });

        it('should return true for ErrorResponse', () => {
            const response: ErrorResponse = {
                action: 'error',
                message: 'error message',
            };

            expect(isNativeMessagingResponse(response)).toBe(true);
        });

        it('should return false for invalid response', () => {
            expect(isNativeMessagingResponse({ action: 'unknown' })).toBe(false);
            expect(isNativeMessagingResponse(null)).toBe(false);
            expect(isNativeMessagingResponse(undefined)).toBe(false);
        });
    });

    describe('isStringArray', () => {
        it('should return true for empty array', () => {
            expect(isStringArray([])).toBe(true);
        });

        it('should return true for array of strings', () => {
            expect(isStringArray(['a', 'b', 'c'])).toBe(true);
        });

        it('should return false for non-array', () => {
            expect(isStringArray('string')).toBe(false);
            expect(isStringArray(123)).toBe(false);
            expect(isStringArray(null)).toBe(false);
            expect(isStringArray(undefined)).toBe(false);
            expect(isStringArray({})).toBe(false);
        });

        it('should return false for array with non-string elements', () => {
            expect(isStringArray([1, 2, 3])).toBe(false);
            expect(isStringArray(['a', 1, 'b'])).toBe(false);
            expect(isStringArray([null])).toBe(false);
            expect(isStringArray([undefined])).toBe(false);
        });
    });

    describe('isAWSProfile', () => {
        it('should return true for valid AWSProfile', () => {
            const validProfile: AWSProfile = {
                name: 'test-profile',
                has_credentials: true,
                expiration: '2025-12-31T23:59:59Z',
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
            };

            expect(isAWSProfile(validProfile)).toBe(true);
        });

        it('should return true for AWSProfile with null expiration', () => {
            const profile: AWSProfile = {
                name: 'test-profile',
                has_credentials: true,
                expiration: null,
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
            };

            expect(isAWSProfile(profile)).toBe(true);
        });

        it('should return true for AWSProfile with optional SSO fields', () => {
            const profile: AWSProfile = {
                name: 'test-profile',
                has_credentials: true,
                expiration: null,
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
                is_sso: true,
                sso_start_url: 'https://sso.example.com',
                sso_session: 'session-name',
            };

            expect(isAWSProfile(profile)).toBe(true);
        });

        it('should return false for null', () => {
            expect(isAWSProfile(null)).toBe(false);
        });

        it('should return false for non-object', () => {
            expect(isAWSProfile('string')).toBe(false);
            expect(isAWSProfile(123)).toBe(false);
        });

        it('should return false for object missing name', () => {
            expect(isAWSProfile({
                has_credentials: true,
                expiration: null,
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string name', () => {
            expect(isAWSProfile({
                name: 123,
                has_credentials: true,
                expiration: null,
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-boolean has_credentials', () => {
            expect(isAWSProfile({
                name: 'test',
                has_credentials: 'true',
                expiration: null,
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with invalid expiration', () => {
            expect(isAWSProfile({
                name: 'test',
                has_credentials: true,
                expiration: 123,
                expired: false,
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-boolean expired', () => {
            expect(isAWSProfile({
                name: 'test',
                has_credentials: true,
                expiration: null,
                expired: 'false',
                color: 'blue',
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string color', () => {
            expect(isAWSProfile({
                name: 'test',
                has_credentials: true,
                expiration: null,
                expired: false,
                color: 123,
                icon: 'fingerprint',
            })).toBe(false);
        });

        it('should return false for object with non-string icon', () => {
            expect(isAWSProfile({
                name: 'test',
                has_credentials: true,
                expiration: null,
                expired: false,
                color: 'blue',
                icon: 123,
            })).toBe(false);
        });
    });

    describe('isAWSProfileArray', () => {
        it('should return true for empty array', () => {
            expect(isAWSProfileArray([])).toBe(true);
        });

        it('should return true for array of valid profiles', () => {
            const profiles: AWSProfile[] = [
                {
                    name: 'profile1',
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: 'blue',
                    icon: 'fingerprint',
                },
                {
                    name: 'profile2',
                    has_credentials: false,
                    expiration: '2025-12-31T23:59:59Z',
                    expired: true,
                    color: 'red',
                    icon: 'briefcase',
                },
            ];

            expect(isAWSProfileArray(profiles)).toBe(true);
        });

        it('should return false for non-array', () => {
            expect(isAWSProfileArray('string')).toBe(false);
            expect(isAWSProfileArray(null)).toBe(false);
            expect(isAWSProfileArray({})).toBe(false);
        });

        it('should return false for array with invalid profile', () => {
            const invalidArray = [
                {
                    name: 'profile1',
                    has_credentials: true,
                    expiration: null,
                    expired: false,
                    color: 'blue',
                    icon: 'fingerprint',
                },
                {
                    name: 'invalid',
                    // missing required fields
                },
            ];

            expect(isAWSProfileArray(invalidArray)).toBe(false);
        });
    });

    describe('isStorageData', () => {
        it('should return true for empty object', () => {
            expect(isStorageData({})).toBe(true);
        });

        it('should return true for valid StorageData with all fields', () => {
            const validData: StorageData = {
                favorites: ['profile1', 'profile2'],
                recentProfiles: ['profile3'],
                selectedRegion: 'us-east-1',
                cachedProfiles: [
                    {
                        name: 'profile1',
                        has_credentials: true,
                        expiration: null,
                        expired: false,
                        color: 'blue',
                        icon: 'fingerprint',
                    },
                ],
                profilesCacheTime: Date.now(),
                containers: ['container1', 'container2'],
            };

            expect(isStorageData(validData)).toBe(true);
        });

        it('should return true for StorageData with only favorites', () => {
            expect(isStorageData({ favorites: ['profile1'] })).toBe(true);
        });

        it('should return true for StorageData with only recentProfiles', () => {
            expect(isStorageData({ recentProfiles: ['profile1'] })).toBe(true);
        });

        it('should return true for StorageData with only selectedRegion', () => {
            expect(isStorageData({ selectedRegion: 'us-west-2' })).toBe(true);
        });

        it('should return true for StorageData with only cachedProfiles', () => {
            expect(isStorageData({
                cachedProfiles: [
                    {
                        name: 'profile1',
                        has_credentials: true,
                        expiration: null,
                        expired: false,
                        color: 'blue',
                        icon: 'fingerprint',
                    },
                ],
            })).toBe(true);
        });

        it('should return true for StorageData with only profilesCacheTime', () => {
            expect(isStorageData({ profilesCacheTime: 123456789 })).toBe(true);
        });

        it('should return true for StorageData with only containers', () => {
            expect(isStorageData({ containers: ['container1'] })).toBe(true);
        });

        it('should return false for null', () => {
            expect(isStorageData(null)).toBe(false);
        });

        it('should return false for non-object', () => {
            expect(isStorageData('string')).toBe(false);
            expect(isStorageData(123)).toBe(false);
        });

        it('should return false for object with invalid favorites', () => {
            expect(isStorageData({ favorites: 'not-array' })).toBe(false);
            expect(isStorageData({ favorites: [1, 2, 3] })).toBe(false);
        });

        it('should return false for object with invalid recentProfiles', () => {
            expect(isStorageData({ recentProfiles: 'not-array' })).toBe(false);
            expect(isStorageData({ recentProfiles: [1, 2, 3] })).toBe(false);
        });

        it('should return false for object with invalid selectedRegion', () => {
            expect(isStorageData({ selectedRegion: 123 })).toBe(false);
        });

        it('should return false for object with invalid cachedProfiles', () => {
            expect(isStorageData({ cachedProfiles: 'not-array' })).toBe(false);
            expect(isStorageData({ cachedProfiles: [{ invalid: 'profile' }] })).toBe(false);
        });

        it('should return false for object with invalid profilesCacheTime', () => {
            expect(isStorageData({ profilesCacheTime: 'not-number' })).toBe(false);
        });

        it('should return false for object with invalid containers', () => {
            expect(isStorageData({ containers: 'not-array' })).toBe(false);
            expect(isStorageData({ containers: [1, 2, 3] })).toBe(false);
        });
    });
});
