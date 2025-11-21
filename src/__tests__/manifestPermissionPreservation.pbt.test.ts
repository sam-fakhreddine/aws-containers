/**
 * Property-Based Test: Manifest Permission Preservation
 * Feature: webpack-to-wxt-migration, Property 2: Manifest permission preservation
 * Validates: Requirements 1.5
 * 
 * Tests that all permissions from the original manifest.json are preserved
 * in the WXT-generated manifest. This ensures no permissions are lost during
 * the migration from Webpack to WXT.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Property-Based Test: Manifest Permission Preservation', () => {
    let originalManifest: any;
    let wxtManifest: any;

    beforeAll(() => {
        // Read the original manifest from public/manifest.json
        const originalManifestPath = path.resolve(__dirname, '../../public/manifest.json');
        const originalManifestContent = fs.readFileSync(originalManifestPath, 'utf-8');
        originalManifest = JSON.parse(originalManifestContent);

        // Read the WXT-generated manifest from .output/firefox-mv2/manifest.json
        const wxtManifestPath = path.resolve(__dirname, '../../.output/firefox-mv2/manifest.json');
        
        if (!fs.existsSync(wxtManifestPath)) {
            throw new Error(
                'WXT-generated manifest not found. Please run a WXT build first: npm run build'
            );
        }
        
        const wxtManifestContent = fs.readFileSync(wxtManifestPath, 'utf-8');
        wxtManifest = JSON.parse(wxtManifestContent);
    });

    /**
     * Property 1: All original permissions are present in WXT manifest
     * For any permission in the original manifest, it should exist in the WXT manifest
     */
    it('should preserve all original permissions in WXT-generated manifest', () => {
        const originalPermissions = originalManifest.permissions || [];
        const wxtPermissions = wxtManifest.permissions || [];

        // Verify that original manifest has permissions
        expect(originalPermissions.length).toBeGreaterThan(0);

        // For each permission in the original manifest
        originalPermissions.forEach((permission: string) => {
            // It should exist in the WXT-generated manifest
            expect(wxtPermissions).toContain(permission);
        });
    });

    /**
     * Property 2: Permission preservation is consistent across all permission types
     * For any subset of original permissions, all should be present in WXT manifest
     */
    it('should preserve all permission subsets consistently', () => {
        fc.assert(
            fc.property(
                // Generate random subsets of original permissions
                fc.subarray(originalManifest.permissions || []),
                (permissionSubset) => {
                    const wxtPermissions = wxtManifest.permissions || [];
                    
                    // Every permission in the subset should be in WXT manifest
                    permissionSubset.forEach((permission: string) => {
                        expect(wxtPermissions).toContain(permission);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 3: Specific critical permissions are preserved
     * For any critical permission (contextualIdentities, storage, tabs, etc.),
     * it must be present in the WXT manifest
     */
    it('should preserve all critical permissions', () => {
        const criticalPermissions = [
            'contextualIdentities',
            'cookies',
            'storage',
            'tabs',
            'alarms',
            'http://127.0.0.1:10999/*',
            'http://localhost:10999/*'
        ];

        fc.assert(
            fc.property(
                // Test each critical permission
                fc.constantFrom(...criticalPermissions),
                (criticalPermission) => {
                    const wxtPermissions = wxtManifest.permissions || [];
                    expect(wxtPermissions).toContain(criticalPermission);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4: Permission count is preserved or increased
     * The WXT manifest should have at least as many permissions as the original
     */
    it('should have at least as many permissions as the original manifest', () => {
        const originalPermissions = originalManifest.permissions || [];
        const wxtPermissions = wxtManifest.permissions || [];

        expect(wxtPermissions.length).toBeGreaterThanOrEqual(originalPermissions.length);
    });

    /**
     * Property 5: API server permissions are preserved with correct format
     * For any localhost/127.0.0.1 permission, it should be preserved exactly
     */
    it('should preserve API server permissions with exact format', () => {
        const apiPermissions = [
            'http://127.0.0.1:10999/*',
            'http://localhost:10999/*'
        ];

        fc.assert(
            fc.property(
                fc.constantFrom(...apiPermissions),
                (apiPermission) => {
                    const wxtPermissions = wxtManifest.permissions || [];
                    
                    // Should contain the exact permission string
                    expect(wxtPermissions).toContain(apiPermission);
                    
                    // Should not be modified (e.g., no https, no different port)
                    const matchingPermissions = wxtPermissions.filter(
                        (p: string) => p.includes('10999')
                    );
                    expect(matchingPermissions).toContain(apiPermission);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6: Permission order doesn't affect preservation
     * Regardless of the order we check permissions, all should be present
     */
    it('should preserve permissions regardless of check order', () => {
        fc.assert(
            fc.property(
                // Generate random shuffles of original permissions
                fc.shuffledSubarray(originalManifest.permissions || []),
                (shuffledPermissions) => {
                    const wxtPermissions = wxtManifest.permissions || [];
                    
                    // All permissions should be present regardless of order
                    shuffledPermissions.forEach((permission: string) => {
                        expect(wxtPermissions).toContain(permission);
                    });
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: No duplicate permissions in WXT manifest
     * For any permission in the WXT manifest, it should appear exactly once
     */
    it('should not have duplicate permissions in WXT manifest', () => {
        const wxtPermissions = wxtManifest.permissions || [];
        
        fc.assert(
            fc.property(
                fc.constantFrom(...wxtPermissions),
                (permission) => {
                    // Count occurrences of this permission
                    const count = wxtPermissions.filter(
                        (p: string) => p === permission
                    ).length;
                    
                    // Should appear exactly once
                    expect(count).toBe(1);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 8: Browser-specific permissions are preserved
     * For any Firefox-specific permission (contextualIdentities), it should be preserved
     */
    it('should preserve Firefox-specific permissions', () => {
        const firefoxPermissions = ['contextualIdentities'];
        
        fc.assert(
            fc.property(
                fc.constantFrom(...firefoxPermissions),
                (firefoxPermission) => {
                    const wxtPermissions = wxtManifest.permissions || [];
                    expect(wxtPermissions).toContain(firefoxPermission);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 9: Permission format is valid
     * For any permission in the WXT manifest, it should be a non-empty string
     */
    it('should have valid permission format in WXT manifest', () => {
        const wxtPermissions = wxtManifest.permissions || [];
        
        fc.assert(
            fc.property(
                fc.constantFrom(...wxtPermissions),
                (permission) => {
                    // Should be a string
                    expect(typeof permission).toBe('string');
                    
                    // Should not be empty
                    expect(permission.length).toBeGreaterThan(0);
                    
                    // Should not have leading/trailing whitespace
                    expect(permission).toBe(permission.trim());
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 10: Manifest version is preserved
     * The manifest_version should be 2 in both manifests
     */
    it('should preserve manifest version 2', () => {
        expect(originalManifest.manifest_version).toBe(2);
        expect(wxtManifest.manifest_version).toBe(2);
    });
});
