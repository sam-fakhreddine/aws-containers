# Firefox Hang Issue - Diagnosis & Fix

## Problem
After 5-10 minutes with the extension loaded, Firefox loses the ability to load webpages and requires a complete restart.

## Root Causes

### 1. **Event Listener Accumulation** ✅ FIXED
- `browser.runtime.onMessage` listener was registered every time backgroundPage.ts loaded
- Multiple popup opens = multiple duplicate listeners
- **Fix**: Guard listener registration with flag

### 2. **Unhandled Promise Rejections** ✅ FIXED  
- `browser.runtime.sendMessage()` can fail if background page isn't ready
- Unhandled rejections can cause browser instability
- **Fix**: Added `.catch()` handler

### 3. **Container Query Leaks** ⚠️ POTENTIAL ISSUE
- `browser.contextualIdentities.query()` called frequently
- No cleanup or debouncing
- **Recommendation**: Add query debouncing

### 4. **Storage Operations** ⚠️ POTENTIAL ISSUE
- Frequent `browser.storage.local` reads/writes
- No batching or throttling
- **Recommendation**: Batch storage updates

## Applied Fixes

### Fix 1: Background Page Listener Guard ✅
```typescript
// Before: Listener registered on every load
browser.runtime.onMessage.addListener((request) => { ... });

// After: Listener registered only once
let messageListenerRegistered = false;
if (!messageListenerRegistered) {
    browser.runtime.onMessage.addListener(handleMessage);
    messageListenerRegistered = true;
}
```

### Fix 2: Promise Error Handling ✅
```typescript
// Before: Unhandled rejection
browser.runtime.sendMessage({ popupMounted: true });

// After: Caught rejection
browser.runtime.sendMessage({ popupMounted: true }).catch(() => {
    // Ignore errors if background page isn't ready
});
```

### Fix 3: Component Unmount Cleanup ✅
```typescript
// Added to useProfiles and useContainers
useEffect(() => {
    let mounted = true;
    
    // ... async operations ...
    
    return () => {
        mounted = false; // Prevent state updates after unmount
    };
}, []);
```

### Fix 4: Timeout Cleanup in API Client ✅
```typescript
// Moved timeout into try block to ensure cleanup
const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
try {
    // ... fetch logic ...
    clearTimeout(timeoutId);
} catch (error) {
    clearTimeout(timeoutId); // Always cleanup
    throw error;
}
```

## Additional Recommendations

### 1. Add Container Query Debouncing
```typescript
// In useContainers.ts
import { debounce } from 'lodash'; // or implement custom

const debouncedRefresh = useMemo(
    () => debounce(refreshContainers, 500),
    [refreshContainers]
);
```

### 2. Batch Storage Updates
```typescript
// Instead of multiple writes:
await browser.storage.local.set({ key1: val1 });
await browser.storage.local.set({ key2: val2 });

// Batch them:
await browser.storage.local.set({ 
    key1: val1, 
    key2: val2 
});
```

### 3. Add Cleanup on Popup Close
```typescript
useEffect(() => {
    return () => {
        // Cleanup on unmount
        // Cancel pending requests, clear timers, etc.
    };
}, []);
```

## Testing

1. **Load extension** in Firefox
2. **Open/close popup** 10-20 times rapidly
3. **Wait 10 minutes** with popup closed
4. **Try loading** a webpage
5. **Check** `about:memory` for leaks

## Monitoring

Check Firefox console for:
- ❌ Unhandled promise rejections
- ❌ Memory warnings
- ❌ "Too many listeners" warnings
- ❌ Storage quota errors

## If Issue Persists

1. **Check Firefox console** (`Ctrl+Shift+J`)
2. **Monitor memory** (`about:memory`)
3. **Check extension logs** (`about:debugging`)
4. **Disable other extensions** to isolate
5. **Test in Firefox safe mode**

## Files Modified

- ✅ `src/backgroundPage.ts` - Added listener guard
- ✅ `src/popup/awsProfiles.tsx` - Added error handling for sendMessage
- ✅ `src/popup/hooks/useProfiles.ts` - Added unmount cleanup flag
- ✅ `src/popup/hooks/useContainers.ts` - Added unmount cleanup flag
- ✅ `src/services/apiClient.ts` - Improved timeout cleanup

## Build & Test

```bash
# Rebuild extension
yarn build

# Reload in Firefox
# Go to about:debugging → Reload extension
```
