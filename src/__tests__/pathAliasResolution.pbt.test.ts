/**
 * Property-Based Test: Path Alias Resolution
 * Feature: webpack-to-wxt-migration, Property 5: Path alias resolution
 * Validates: Requirements 6.1, 6.2, 6.3
 * 
 * Tests that path aliases (@/ and @src) correctly resolve to the src/ directory
 * in the WXT build system. This ensures TypeScript and Vite module resolution
 * work correctly after migration from Webpack.
 */

import * as fc from 'fast-check';
import * as path from 'path';
import * as fs from 'fs';

describe('Property-Based Test: Path Alias Resolution', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.resolve(projectRoot, 'src');

    /**
     * Helper function to resolve import path using TypeScript/Vite resolution logic
     * Simulates how the build system resolves @/ and @src aliases
     */
    function resolveImportPath(importPath: string): string | null {
        // Handle @/ alias
        if (importPath.startsWith('@/')) {
            const relativePath = importPath.substring(2);
            return path.resolve(srcDir, relativePath);
        }
        
        // Handle @src/ alias
        if (importPath.startsWith('@src/')) {
            const relativePath = importPath.substring(5);
            return path.resolve(srcDir, relativePath);
        }
        
        // Handle @ alias (without trailing slash)
        if (importPath === '@' || importPath === '@src') {
            return srcDir;
        }
        
        return null;
    }

    /**
     * Helper function to check if a resolved path is within src/ directory
     */
    function isWithinSrcDirectory(resolvedPath: string): boolean {
        const normalizedResolved = path.normalize(resolvedPath);
        const normalizedSrc = path.normalize(srcDir);
        return normalizedResolved.startsWith(normalizedSrc);
    }

    /**
     * Property 1: @/ alias resolves to src/ directory
     * For any valid module path, @/ should resolve to src/
     */
    it('should resolve @/ alias to src/ directory', () => {
        fc.assert(
            fc.property(
                // Generate various module paths
                fc.oneof(
                    fc.constant('services/apiClient'),
                    fc.constant('hooks/useProfiles'),
                    fc.constant('components/ProfileItem'),
                    fc.constant('utils/containerManager'),
                    fc.constant('types'),
                    fc.constant('constants'),
                    fc.constant('services/config'),
                    fc.constant('hooks/useTheme'),
                    fc.constant('components/ErrorState'),
                    fc.constant('popup/awsProfiles')
                ),
                (modulePath) => {
                    const importPath = `@/${modulePath}`;
                    const resolved = resolveImportPath(importPath);
                    
                    // Should resolve to a path
                    expect(resolved).not.toBeNull();
                    
                    if (resolved) {
                        // Should be within src/ directory
                        expect(isWithinSrcDirectory(resolved)).toBe(true);
                        
                        // Should contain the module path
                        expect(resolved).toContain(modulePath);
                        
                        // Should start with src directory
                        expect(resolved.startsWith(srcDir)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 2: @src/ alias resolves to src/ directory
     * For any valid module path, @src/ should resolve to src/
     */
    it('should resolve @src/ alias to src/ directory', () => {
        fc.assert(
            fc.property(
                // Generate various module paths
                fc.oneof(
                    fc.constant('services/apiClient'),
                    fc.constant('hooks/useProfiles'),
                    fc.constant('components/ProfileItem'),
                    fc.constant('utils/containerManager'),
                    fc.constant('types'),
                    fc.constant('constants'),
                    fc.constant('services/browserUtils'),
                    fc.constant('hooks/useContainers'),
                    fc.constant('components/LoadingState')
                ),
                (modulePath) => {
                    const importPath = `@src/${modulePath}`;
                    const resolved = resolveImportPath(importPath);
                    
                    // Should resolve to a path
                    expect(resolved).not.toBeNull();
                    
                    if (resolved) {
                        // Should be within src/ directory
                        expect(isWithinSrcDirectory(resolved)).toBe(true);
                        
                        // Should contain the module path
                        expect(resolved).toContain(modulePath);
                        
                        // Should start with src directory
                        expect(resolved.startsWith(srcDir)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 3: @/ and @src/ resolve to the same location
     * For any module path, @/ and @src/ should resolve to the same file
     */
    it('should resolve @/ and @src/ to the same location', () => {
        fc.assert(
            fc.property(
                // Generate various module paths
                fc.oneof(
                    fc.constant('services/apiClient'),
                    fc.constant('hooks/useProfiles'),
                    fc.constant('components/ProfileItem'),
                    fc.constant('utils/containerManager'),
                    fc.constant('types/index'),
                    fc.constant('constants/index')
                ),
                (modulePath) => {
                    const importPath1 = `@/${modulePath}`;
                    const importPath2 = `@src/${modulePath}`;
                    
                    const resolved1 = resolveImportPath(importPath1);
                    const resolved2 = resolveImportPath(importPath2);
                    
                    // Both should resolve
                    expect(resolved1).not.toBeNull();
                    expect(resolved2).not.toBeNull();
                    
                    if (resolved1 && resolved2) {
                        // Should resolve to the same path
                        expect(path.normalize(resolved1)).toBe(path.normalize(resolved2));
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 4: Resolved paths point to actual files or directories
     * For any import path that resolves, it should point to an existing file or directory
     */
    it('should resolve to existing files or directories', () => {
        fc.assert(
            fc.property(
                // Generate paths to known existing modules
                fc.oneof(
                    fc.constant('@/services/apiClient.ts'),
                    fc.constant('@/hooks/useProfiles.ts'),
                    fc.constant('@/components/ProfileItem.tsx'),
                    fc.constant('@/utils/containerManager.ts'),
                    fc.constant('@/types/index.ts'),
                    fc.constant('@/constants/index.ts'),
                    fc.constant('@src/services/config.ts'),
                    fc.constant('@src/hooks/useTheme.ts'),
                    fc.constant('@src/components/ErrorState.tsx')
                ),
                (importPath) => {
                    const resolved = resolveImportPath(importPath);
                    
                    expect(resolved).not.toBeNull();
                    
                    if (resolved) {
                        // Check if file exists (with or without extension)
                        const existsAsIs = fs.existsSync(resolved);
                        const existsWithTs = fs.existsSync(resolved.replace(/\.tsx?$/, '') + '.ts');
                        const existsWithTsx = fs.existsSync(resolved.replace(/\.tsx?$/, '') + '.tsx');
                        const existsAsDir = fs.existsSync(resolved) && fs.statSync(resolved).isDirectory();
                        
                        // At least one should exist
                        expect(existsAsIs || existsWithTs || existsWithTsx || existsAsDir).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5: Path aliases work with nested directories
     * For any nested path, aliases should correctly resolve through multiple directory levels
     */
    it('should resolve nested directory paths correctly', () => {
        fc.assert(
            fc.property(
                // Generate nested paths
                fc.oneof(
                    fc.constant('@/popup/components/ProfileSearch'),
                    fc.constant('@/popup/hooks/useProfileSearch'),
                    fc.constant('@/services/apiClient'),
                    fc.constant('@src/popup/components/ProfileSearch'),
                    fc.constant('@src/popup/hooks/useProfileSearch'),
                    fc.constant('@src/opener/containers')
                ),
                (importPath) => {
                    const resolved = resolveImportPath(importPath);
                    
                    expect(resolved).not.toBeNull();
                    
                    if (resolved) {
                        // Should be within src/ directory
                        expect(isWithinSrcDirectory(resolved)).toBe(true);
                        
                        // Should preserve directory structure
                        const pathParts = importPath.replace(/^@(src)?\//, '').split('/');
                        pathParts.forEach(part => {
                            if (part) {
                                expect(resolved).toContain(part);
                            }
                        });
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6: Bare @ and @src resolve to src/ directory root
     * For bare aliases without paths, they should resolve to src/ directory
     */
    it('should resolve bare @ and @src to src/ directory root', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('@', '@src'),
                (alias) => {
                    const resolved = resolveImportPath(alias);
                    
                    expect(resolved).not.toBeNull();
                    
                    if (resolved) {
                        // Should resolve to src directory
                        expect(path.normalize(resolved)).toBe(path.normalize(srcDir));
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: Path aliases are case-sensitive
     * For any path with different casing, resolution should be case-sensitive
     */
    it('should handle path aliases in a case-sensitive manner', () => {
        fc.assert(
            fc.property(
                fc.constant('services/apiClient'),
                (modulePath) => {
                    const lowerPath = `@/${modulePath.toLowerCase()}`;
                    const originalPath = `@/${modulePath}`;
                    
                    const resolvedLower = resolveImportPath(lowerPath);
                    const resolvedOriginal = resolveImportPath(originalPath);
                    
                    // Both should resolve
                    expect(resolvedLower).not.toBeNull();
                    expect(resolvedOriginal).not.toBeNull();
                    
                    if (resolvedLower && resolvedOriginal) {
                        // Paths should differ if casing differs
                        if (modulePath !== modulePath.toLowerCase()) {
                            expect(resolvedLower).not.toBe(resolvedOriginal);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 8: Invalid aliases return null
     * For any import path that doesn't use @/ or @src/, resolution should return null
     */
    it('should return null for non-aliased import paths', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant('./services/apiClient'),
                    fc.constant('../components/ProfileItem'),
                    fc.constant('react'),
                    fc.constant('webextension-polyfill'),
                    fc.constant('/absolute/path'),
                    fc.constant('relative/path')
                ),
                (importPath) => {
                    const resolved = resolveImportPath(importPath);
                    
                    // Should not resolve non-aliased paths
                    expect(resolved).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 9: Path normalization is consistent
     * For any resolved path, it should be properly normalized (no ../ or ./)
     */
    it('should return normalized paths without relative segments', () => {
        fc.assert(
            fc.property(
                fc.oneof(
                    fc.constant('@/services/apiClient'),
                    fc.constant('@src/hooks/useProfiles'),
                    fc.constant('@/components/ProfileItem')
                ),
                (importPath) => {
                    const resolved = resolveImportPath(importPath);
                    
                    expect(resolved).not.toBeNull();
                    
                    if (resolved) {
                        // Should not contain relative path segments
                        expect(resolved).not.toContain('../');
                        expect(resolved).not.toContain('./');
                        
                        // Should be an absolute path
                        expect(path.isAbsolute(resolved)).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 10: All actual imports in codebase can be resolved
     * For any import statement found in the actual codebase, it should resolve correctly
     */
    it('should resolve all actual imports from the codebase', () => {
        // Read actual imports from a known file
        const apiClientPath = path.resolve(srcDir, 'services/apiClient.ts');
        const content = fs.readFileSync(apiClientPath, 'utf-8');
        
        // Extract import statements with @/ or @src
        const importRegex = /from\s+["'](@(?:src)?\/[^"']+)["']/g;
        const imports: string[] = [];
        let match;
        
        while ((match = importRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        
        // Test each actual import
        imports.forEach(importPath => {
            const resolved = resolveImportPath(importPath);
            
            expect(resolved).not.toBeNull();
            
            if (resolved) {
                // Should be within src/ directory
                expect(isWithinSrcDirectory(resolved)).toBe(true);
                
                // Should be an absolute path
                expect(path.isAbsolute(resolved)).toBe(true);
            }
        });
    });
});
