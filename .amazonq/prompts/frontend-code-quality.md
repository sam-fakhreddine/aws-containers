# Frontend Code Quality Improvements

Apply these code quality improvements to the frontend/extension TypeScript/React files:

## 1. Import Organization

Organize all imports in this order:
1. React imports
2. External library imports (alphabetical)
3. Internal imports (alphabetical, grouped by type)
4. Type imports
5. Constants
6. Styles

Example:
```typescript
// React
import React, { useState, useEffect, useCallback } from "react";

// External libraries
import browser from "webextension-polyfill";

// Cloudscape components (grouped)
import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";

// Internal - hooks
import { useProfiles, useFavorites } from "./hooks";

// Internal - components
import { ProfileList, ErrorState } from "./components";

// Internal - services
import * as apiClient from "../services/apiClient";

// Internal - utils
import { prepareContainer } from "../utils/containerManager";

// Types
import { AWSProfile } from "./types";

// Constants
import { POPUP_WIDTH_THRESHOLD } from "./constants";
```

## 2. Extract Magic Numbers to Constants

Move all hardcoded values to `src/popup/constants.ts`:
- Debounce delays (300ms)
- Timeout values (5000ms)
- Transition durations (200ms)
- Any other numeric literals used in logic

## 3. Fix useEffect Dependencies

Review all `useEffect` hooks and ensure dependency arrays are correct:
- Include all referenced functions/variables
- Use `useCallback` for functions used in dependencies
- Use `useRef` if intentionally want single execution

## 4. Add Input Validation

For `src/settings/settings.tsx`:
- Validate token format before saving
- Add regex pattern for expected token format
- Show specific error messages for invalid formats

## 5. Add JSDoc Comments

Add JSDoc to all:
- Exported functions
- Custom hooks
- Complex utility functions
- Type definitions

Format:
```typescript
/**
 * Brief description
 * @param paramName - Description
 * @returns Description
 */
```

## 6. Improve Error Messages

Make error messages more specific:
- Include status codes
- Add context about what failed
- Suggest next steps
- Reference relevant documentation

## 7. Standardize Async Patterns

Use `async/await` consistently instead of mixing with `.then()`:
```typescript
// ❌ Avoid
promise.then(() => { ... });

// ✅ Prefer
await promise;
```

## 8. Replace Inline Styles

Replace hardcoded colors/styles with:
- Cloudscape design tokens
- CSS modules
- Styled components

## 9. Audit Dependencies

Check and remove if unused:
- `react-test-renderer`
- `@types/chrome`
- Run `npx depcheck` to find others

## 10. Improve Token Handling

In `src/services/apiClient.ts`:
- Add token format validation
- Consider token expiration handling
- Add better error recovery

## Rules

- Make minimal changes per file
- Preserve all existing functionality
- Don't remove any user code
- Add comments explaining non-obvious changes
- Run tests after each change
- Commit after each logical group of changes

## Priority Order

1. Import organization (all files)
2. Extract magic numbers (constants.ts + usage sites)
3. Fix useEffect dependencies (hooks files)
4. Add input validation (settings.tsx)
5. Add JSDoc (all exported functions)
6. Improve error messages (apiClient.ts)
7. Standardize async (popup/index.tsx, hooks)
8. Replace inline styles (awsProfiles.tsx)
9. Audit dependencies (package.json)
10. Improve token handling (apiClient.ts)
