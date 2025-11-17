# Extension API

Internal API documentation for the AWS Profile Containers extension.

## Browser APIs Used

### Containers (contextualIdentities)

```typescript
// Create container
browser.contextualIdentities.create({
  name: string,
  color: "red" | "yellow" | "green" | ...,
  icon: "fingerprint" | "briefcase" | ...
});

// Get container by name
browser.contextualIdentities.query({ name: string });

// Remove container
browser.contextualIdentities.remove(cookieStoreId: string);
```

### Storage

```typescript
// Store data
browser.storage.local.set({
  favorites: string[],
  recent: string[],
  region: string
});

// Get data
browser.storage.local.get(["favorites", "recent", "region"]);
```

### Tabs

```typescript
// Open tab in container
browser.tabs.create({
  url: string,
  cookieStoreId: string
});
```

### Native Messaging

```typescript
// Send message to native host
browser.runtime.sendNativeMessage(
  "aws_profile_bridge",
  { action: "getProfiles" }
);

// Connect to native host
browser.runtime.connectNative("aws_profile_bridge");
```

## Internal Components

### Container Manager

```typescript
// Create or get container for profile
async function createOrGetContainer(
  profileName: string,
  color: string,
  icon: string
): Promise<string> {
  // Returns cookieStoreId
}

// Clear all containers
async function clearAllContainers(): Promise<void>
```

### Profile Store

```typescript
// Get favorites
async function getFavorites(): Promise<string[]>

// Add favorite
async function addFavorite(profileName: string): Promise<void>

// Remove favorite
async function removeFavorite(profileName: string): Promise<void>

// Get recent profiles
async function getRecent(): Promise<string[]>

// Add to recent
async function addRecent(profileName: string): Promise<void>
```

### Region Selector

```typescript
// Get selected region
async function getSelectedRegion(): Promise<string>

// Set region
async function setRegion(region: string): Promise<void>
```

## React Components

### AWSProfiles

Main popup component.

**Props:** None

**State:**
- `profiles: Profile[]` - All profiles
- `searchTerm: string` - Current search
- `selectedRegion: string` - Selected AWS region
- `favorites: Set<string>` - Favorited profile names
- `recent: string[]` - Recent profile names

**Methods:**
- `handleProfileClick(profile)` - Open profile
- `handleFavoriteToggle(profile)` - Toggle favorite
- `handleSearch(term)` - Filter profiles

## Message Protocol

### Popup ↔ Background

**Get profiles:**
```typescript
// Popup sends
{ action: "getProfiles" }

// Background responds
{ profiles: Profile[] }
```

**Open profile:**
```typescript
// Popup sends
{
  action: "openProfile",
  profileName: string,
  region: string
}

// Background responds
{ url: string }
```

## Types

```typescript
interface Profile {
  name: string;
  type: "credential" | "sso";
  color: string;
  icon: string;
  expired: boolean;
  expiresAt?: string;
  timeRemaining?: string;
}

interface Container {
  cookieStoreId: string;
  name: string;
  color: string;
  icon: string;
}
```

## Further Reading

- [Architecture](../development/architecture.md)
- [Native Messaging API](api-server.md)
- [Contributing](../development/contributing.md)
