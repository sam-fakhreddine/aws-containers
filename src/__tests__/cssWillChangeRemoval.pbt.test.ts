/**
 * Property-Based Test: CSS will-change Property Removal
 * Feature: webpack-to-wxt-migration, Property 8: CSS property removal
 * Validates: Requirements 4.4
 * 
 * Tests that all will-change CSS properties have been removed from the codebase.
 * The will-change property can cause browser hangs and excessive memory usage,
 * so it must be completely removed from all component files and SCSS files.
 */

import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

describe('Property-Based Test: CSS will-change Property Removal', () => {
    const projectRoot = path.resolve(__dirname, '../..');
    const srcDir = path.resolve(projectRoot, 'src');

    /**
     * Helper function to recursively find files with specific extensions
     */
    function findFiles(dir: string, extensions: string[], excludeDirs: string[] = []): string[] {
        const files: string[] = [];
        
        function traverse(currentDir: string) {
            const entries = fs.readdirSync(currentDir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(currentDir, entry.name);
                
                if (entry.isDirectory()) {
                    // Skip excluded directories
                    if (!excludeDirs.includes(entry.name)) {
                        traverse(fullPath);
                    }
                } else if (entry.isFile()) {
                    const ext = path.extname(entry.name);
                    if (extensions.includes(ext)) {
                        files.push(fullPath);
                    }
                }
            }
        }
        
        traverse(dir);
        return files;
    }

    /**
     * Property 1: No will-change in component files
     * For any component file (tsx/ts), it should not contain will-change CSS properties
     * Validates: Requirements 4.4
     */
    it('should not contain will-change properties in component files', () => {
        // Find all TypeScript/TSX files in src directory
        const componentFiles = findFiles(srcDir, ['.ts', '.tsx'], ['__tests__', '__mocks__', 'node_modules']);

        expect(componentFiles.length).toBeGreaterThan(0);

        componentFiles.forEach(file => {
            const fileContent = fs.readFileSync(file, 'utf-8');

            // Check for will-change property in various formats
            // - CSS-in-JS: willChange: 'transform'
            // - CSS-in-JS: 'will-change': 'transform'
            // - Inline styles: will-change: transform
            // - Template literals with CSS
            const willChangePatterns = [
                /willChange\s*:\s*['"`]/i,
                /['"`]will-change['"`]\s*:\s*['"`]/i,
                /will-change\s*:\s*[^;}\n]+/i,
                /will-change\s*=\s*['"`]/i
            ];

            willChangePatterns.forEach(pattern => {
                const match = fileContent.match(pattern);
                if (match) {
                    fail(`Found will-change property in ${file}: ${match[0]}`);
                }
            });
        });
    });

    /**
     * Property 2: No will-change in SCSS files
     * For any SCSS file, it should not contain will-change CSS properties
     * Validates: Requirements 4.4
     */
    it('should not contain will-change properties in SCSS files', () => {
        // Find all SCSS files
        const scssDir = path.resolve(srcDir, 'scss');
        const scssFiles = findFiles(scssDir, ['.scss', '.css'], ['node_modules']);

        expect(scssFiles.length).toBeGreaterThan(0);

        scssFiles.forEach(file => {
            const fileContent = fs.readFileSync(file, 'utf-8');

            // Check for will-change property in SCSS
            const willChangePattern = /will-change\s*:\s*[^;}\n]+/i;
            const match = fileContent.match(willChangePattern);

            if (match) {
                fail(`Found will-change property in ${file}: ${match[0]}`);
            }
        });
    });

    /**
     * Property 3: No will-change in specific previously problematic files
     * For ProfileItem and awsProfiles components specifically, verify no will-change
     * Validates: Requirements 4.4
     */
    it('should not contain will-change in ProfileItem and awsProfiles components', () => {
        const problematicFiles = [
            'src/popup/components/ProfileItem.tsx',
            'src/popup/awsProfiles.tsx'
        ];

        problematicFiles.forEach(file => {
            const filePath = path.resolve(file);
            
            // Check if file exists
            if (!fs.existsSync(filePath)) {
                // File might have been moved or renamed, search for it
                const fileName = path.basename(file);
                console.warn(`File ${file} not found at expected location, searching for ${fileName}`);
                return;
            }

            const fileContent = fs.readFileSync(filePath, 'utf-8');

            // Check for will-change in any format
            const willChangePatterns = [
                /willChange/i,
                /will-change/i
            ];

            willChangePatterns.forEach(pattern => {
                const match = fileContent.match(pattern);
                if (match) {
                    fail(`Found will-change reference in ${file}: ${match[0]}`);
                }
            });
        });
    });

    /**
     * Property 4: Consistent absence across random file samples
     * For any randomly selected file from the codebase, it should not contain will-change
     * Uses property-based testing to verify across multiple iterations
     */
    it('should consistently have no will-change properties across random file samples', () => {
        // Get all source files
        const allFiles = findFiles(srcDir, ['.ts', '.tsx', '.scss', '.css'], ['__tests__', '__mocks__', 'node_modules']);

        expect(allFiles.length).toBeGreaterThan(0);

        fc.assert(
            fc.property(
                fc.constantFrom(...allFiles),
                (file) => {
                    const fileContent = fs.readFileSync(file, 'utf-8');

                    // Comprehensive will-change detection
                    const hasWillChange = 
                        /willChange\s*[:=]/i.test(fileContent) ||
                        /will-change\s*:/i.test(fileContent) ||
                        /['"`]will-change['"`]/i.test(fileContent);

                    expect(hasWillChange).toBe(false);
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 5: No will-change in CSS property declarations
     * For any file containing CSS property declarations, verify will-change is not used
     */
    it('should not use will-change in any CSS property declarations', () => {
        const styleFiles = findFiles(srcDir, ['.ts', '.tsx', '.scss', '.css'], ['__tests__', '__mocks__', 'node_modules']);

        fc.assert(
            fc.property(
                fc.constantFrom(...styleFiles),
                (file) => {
                    const fileContent = fs.readFileSync(file, 'utf-8');

                    // Look for CSS property declarations that might contain will-change
                    const cssPropertyPattern = /(?:style|css|className)\s*[=:]\s*[{`"']/gi;
                    const matches = fileContent.match(cssPropertyPattern);

                    if (matches) {
                        // If we find style/css declarations, ensure they don't contain will-change
                        const styleBlockPattern = /(?:style|css|className)\s*[=:]\s*([{`"'][^}]*[}`"'])/gi;
                        let match;
                        while ((match = styleBlockPattern.exec(fileContent)) !== null) {
                            const styleBlock = match[1];
                            expect(styleBlock).not.toMatch(/will-change/i);
                        }
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 6: Verify specific transform and scroll-position patterns are removed
     * For any file, verify the specific problematic patterns mentioned in requirements
     * (will-change: transform and will-change: scroll-position)
     */
    it('should not contain will-change: transform or will-change: scroll-position', () => {
        const allFiles = findFiles(srcDir, ['.ts', '.tsx', '.scss', '.css'], ['__tests__', '__mocks__', 'node_modules']);

        const problematicPatterns = [
            /will-change\s*:\s*transform/i,
            /will-change\s*:\s*scroll-position/i,
            /willChange\s*:\s*['"`]transform['"`]/i,
            /willChange\s*:\s*['"`]scroll-position['"`]/i
        ];

        fc.assert(
            fc.property(
                fc.constantFrom(...allFiles),
                fc.constantFrom(...problematicPatterns),
                (file, pattern) => {
                    const fileContent = fs.readFileSync(file, 'utf-8');

                    const match = fileContent.match(pattern);
                    expect(match).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    /**
     * Property 7: Documentation and comments should not suggest using will-change
     * For any file, comments should not recommend using will-change
     */
    it('should not have comments recommending will-change usage', () => {
        const allFiles = findFiles(srcDir, ['.ts', '.tsx', '.scss', '.css'], ['__tests__', '__mocks__', 'node_modules']);

        allFiles.forEach(file => {
            const fileContent = fs.readFileSync(file, 'utf-8');

            // Extract comments
            const commentPatterns = [
                /\/\*[\s\S]*?\*\//g,  // Multi-line comments
                /\/\/.*/g              // Single-line comments
            ];

            commentPatterns.forEach(pattern => {
                const comments = fileContent.match(pattern) || [];
                comments.forEach(comment => {
                    // Check if comment mentions will-change in a positive/instructive way
                    if (/will-change/i.test(comment) && !/remove|removed|don't|avoid|not/i.test(comment)) {
                        fail(`Found comment suggesting will-change usage in ${file}: ${comment}`);
                    }
                });
            });
        });
    });

    /**
     * Property 8: Verify alternative performance patterns are used instead
     * For components that previously used will-change, verify they use proper React optimizations
     */
    it('should use React optimizations instead of will-change', () => {
        const optimizedFiles = [
            {
                file: 'src/popup/components/ProfileItem.tsx',
                shouldHave: ['memo', 'useMemo', 'useCallback']
            },
            {
                file: 'src/popup/awsProfiles.tsx',
                shouldHave: ['memo', 'useMemo', 'useCallback']
            }
        ];

        fc.assert(
            fc.property(
                fc.constantFrom(...optimizedFiles),
                ({ file, shouldHave }) => {
                    const filePath = path.resolve(file);
                    
                    if (!fs.existsSync(filePath)) {
                        console.warn(`File ${file} not found, skipping optimization check`);
                        return;
                    }

                    const fileContent = fs.readFileSync(filePath, 'utf-8');

                    // Verify no will-change
                    expect(fileContent).not.toMatch(/will-change/i);

                    // Verify at least one React optimization is present
                    const hasOptimization = shouldHave.some(optimization => 
                        new RegExp(`\\b${optimization}\\b`).test(fileContent)
                    );

                    expect(hasOptimization).toBe(true);
                }
            ),
            { numRuns: 100 }
        );
    });
});
