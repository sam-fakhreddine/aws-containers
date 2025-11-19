# Agentic Coding Rules - AWS Profile Containers

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Purpose**: This document serves as the definitive guide for AI coding agents working on the AWS Profile Containers project.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [Code Style and Conventions](#code-style-and-conventions)
5. [File Organization](#file-organization)
6. [Development Workflow](#development-workflow)
7. [Testing Requirements](#testing-requirements)
8. [Security Guidelines](#security-guidelines)
9. [Performance Standards](#performance-standards)
10. [Documentation Requirements](#documentation-requirements)
11. [Git Commit Standards](#git-commit-standards)
12. [Error Handling](#error-handling)
13. [API Design Principles](#api-design-principles)
14. [Browser Extension Guidelines](#browser-extension-guidelines)
15. [Python API Server Guidelines](#python-api-server-guidelines)
16. [Dependencies Management](#dependencies-management)
17. [Build and Deployment](#build-and-deployment)
18. [Common Pitfalls to Avoid](#common-pitfalls-to-avoid)
19. [Code Review Checklist](#code-review-checklist)
20. [Prohibited Practices](#prohibited-practices)

---

## 1. Project Overview

### Mission
AWS Profile Containers is a Firefox extension that provides seamless multi-account AWS profile management using container-based isolation, enabling users to work with multiple AWS accounts simultaneously without context switching.

### Key Components
- **Browser Extension**: React + TypeScript frontend with Cloudscape Design System
- **API Server**: Python FastAPI backend for AWS SDK operations
- **IPC**: REST API communication between extension and local server

### Core Features
1. Multi-account container isolation
2. Automatic AWS console URL generation
3. Profile-container association
4. Secure token management
5. Cross-platform support (Linux, macOS)

---

## 2. Architecture Principles

### Separation of Concerns
- **MUST** separate presentation logic (UI) from business logic
- **MUST** separate data access from business logic
- **MUST** use proper layering: UI → Services → API Client → API Server

### Single Responsibility Principle
- Each function/class **MUST** have ONE clear purpose
- If a function does more than one thing, split it
- Maximum function length: 50 lines (exceptions require justification)

### Dependency Injection
- **PREFER** dependency injection over hard-coded dependencies
- **USE** React Context for shared state
- **AVOID** global variables (except constants)

### Immutability
- **PREFER** immutable data structures
- **USE** `const` by default, `let` only when necessary
- **NEVER** use `var`
- **USE** spread operators for object/array copies

### API-First Design
- All AWS operations **MUST** go through the API server
- Extension **MUST NOT** directly use AWS SDK
- API endpoints **MUST** be RESTful and follow conventions

---

## 3. Technology Stack

### Browser Extension

#### Required Technologies
- **React**: 19.2.0 (functional components only)
- **TypeScript**: ^5.7.2 (strict mode enabled)
- **Cloudscape Design System**: ^3.0.844 (for all UI components)
- **Webpack**: 5.x (for bundling)
- **WebExtension API**: Manifest V2 (Firefox)

#### Forbidden Technologies
- ❌ Class components (use functional components + hooks)
- ❌ jQuery or any DOM manipulation libraries
- ❌ Non-Cloudscape UI libraries (Bootstrap, Material-UI, etc.)
- ❌ Inline styles (use CSS modules or styled-components)

### Python API Server

#### Required Technologies
- **Python**: 3.12+
- **FastAPI**: Latest stable
- **Uvicorn**: ASGI server
- **boto3**: AWS SDK
- **Pydantic**: Data validation
- **pytest**: Testing framework

#### Forbidden Technologies
- ❌ Flask, Django, or other web frameworks
- ❌ Synchronous request handlers (use async/await)
- ❌ Type-free code (all functions must have type hints)

---

## 4. Code Style and Conventions

### TypeScript/JavaScript

#### Naming Conventions
```typescript
// Files: kebab-case
profile-manager.ts
aws-console-service.ts

// Components: PascalCase
ProfileSelectorComponent.tsx
ContainerList.tsx

// Functions/Variables: camelCase
const profileId = "profile-1";
function getUserProfile() {}

// Constants: UPPER_SNAKE_CASE
const MAX_RETRIES = 3;
const API_BASE_URL = "http://localhost:8000";

// Interfaces/Types: PascalCase with 'I' prefix for interfaces (optional)
interface IProfile {}
type ProfileId = string;

// Enums: PascalCase
enum ProfileStatus {
  Active = "active",
  Inactive = "inactive"
}
```

#### Function Guidelines
```typescript
// ✅ GOOD: Pure function, single responsibility
function calculateConsoleUrl(profile: Profile, region: string): string {
  return `https://console.aws.amazon.com/?region=${region}#`;
}

// ❌ BAD: Side effects, multiple responsibilities
function calculateConsoleUrl(profile: Profile, region: string): string {
  console.log("Calculating URL"); // Side effect
  saveToStorage(profile); // Multiple responsibilities
  return `https://console.aws.amazon.com/?region=${region}#`;
}

// ✅ GOOD: Descriptive name, proper async handling
async function fetchProfileFromApi(profileId: string): Promise<Profile> {
  try {
    const response = await apiClient.get(`/profiles/${profileId}`);
    return response.data;
  } catch (error) {
    throw new ProfileFetchError(`Failed to fetch profile ${profileId}`, error);
  }
}

// ❌ BAD: Generic name, poor error handling
async function getData(id: string): Promise<any> {
  const response = await apiClient.get(`/profiles/${id}`);
  return response.data; // No error handling
}
```

#### React Component Guidelines
```typescript
// ✅ GOOD: Functional component with proper typing
interface ProfileCardProps {
  profile: Profile;
  onSelect: (profileId: string) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile, onSelect }) => {
  const handleClick = useCallback(() => {
    onSelect(profile.id);
  }, [profile.id, onSelect]);

  return (
    <Container>
      <Header>{profile.name}</Header>
      <Button onClick={handleClick}>Select</Button>
    </Container>
  );
};

// ❌ BAD: Missing types, inline functions
const ProfileCard = ({ profile, onSelect }) => {
  return (
    <Container>
      <Header>{profile.name}</Header>
      <Button onClick={() => onSelect(profile.id)}>Select</Button>
    </Container>
  );
};
```

#### Hooks Usage
```typescript
// ✅ GOOD: Custom hook with proper naming and cleanup
function useProfileSubscription(profileId: string): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const subscription = profileService.subscribe(profileId, setProfile);

    return () => {
      subscription.unsubscribe();
    };
  }, [profileId]);

  return profile;
}

// ❌ BAD: Missing cleanup, not following hook naming
function getProfile(profileId: string): Profile | null {
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    profileService.subscribe(profileId, setProfile);
    // Missing cleanup!
  }, [profileId]);

  return profile;
}
```

### Python

#### Naming Conventions
```python
# Files: snake_case
profile_manager.py
aws_console_service.py

# Classes: PascalCase
class ProfileManager:
    pass

# Functions/Variables: snake_case
def get_user_profile():
    pass

user_id = "user-123"

# Constants: UPPER_SNAKE_CASE
MAX_RETRIES = 3
API_BASE_URL = "http://localhost:8000"

# Private: _prefix
def _internal_helper():
    pass

_private_var = "secret"
```

#### Function Guidelines
```python
# ✅ GOOD: Type hints, docstring, single responsibility
async def fetch_profile(profile_id: str) -> Profile:
    """
    Fetch a profile by ID from the database.

    Args:
        profile_id: The unique identifier of the profile

    Returns:
        Profile object

    Raises:
        ProfileNotFoundError: If profile doesn't exist
        DatabaseError: If database connection fails
    """
    try:
        profile = await db.get_profile(profile_id)
        if not profile:
            raise ProfileNotFoundError(f"Profile {profile_id} not found")
        return profile
    except Exception as e:
        logger.error(f"Failed to fetch profile {profile_id}: {e}")
        raise

# ❌ BAD: No type hints, no docstring, poor error handling
async def fetch_profile(profile_id):
    profile = await db.get_profile(profile_id)
    return profile
```

#### FastAPI Endpoint Guidelines
```python
# ✅ GOOD: Proper typing, validation, error handling
@app.get("/profiles/{profile_id}", response_model=ProfileResponse)
async def get_profile(
    profile_id: str = Path(..., description="Profile ID"),
    current_user: User = Depends(get_current_user)
) -> ProfileResponse:
    """Get a profile by ID."""
    try:
        profile = await profile_service.get_profile(profile_id)

        # Authorization check
        if profile.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this profile"
            )

        return ProfileResponse.from_profile(profile)
    except ProfileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Profile {profile_id} not found"
        )

# ❌ BAD: No validation, no auth, weak typing
@app.get("/profiles/{profile_id}")
async def get_profile(profile_id: str):
    profile = await profile_service.get_profile(profile_id)
    return profile
```

---

## 5. File Organization

### Browser Extension Structure
```
src/
├── components/          # React components
│   ├── common/         # Reusable components
│   ├── profile/        # Profile-related components
│   ├── container/      # Container-related components
│   └── settings/       # Settings components
├── services/           # Business logic services
│   ├── profile-service.ts
│   ├── container-service.ts
│   └── aws-console-service.ts
├── api/               # API client
│   ├── client.ts
│   └── endpoints/
│       ├── profiles.ts
│       └── containers.ts
├── types/             # TypeScript types and interfaces
│   ├── profile.ts
│   ├── container.ts
│   └── api.ts
├── hooks/             # Custom React hooks
│   ├── useProfile.ts
│   └── useContainer.ts
├── context/           # React contexts
│   ├── ProfileContext.tsx
│   └── AuthContext.tsx
├── utils/             # Utility functions
│   ├── url-parser.ts
│   └── validators.ts
├── constants/         # Constants
│   └── index.ts
├── styles/            # Global styles
│   └── global.css
└── background/        # Background scripts
    └── index.ts
```

### Python API Server Structure
```
api-server/
├── src/
│   ├── main.py              # FastAPI app entry point
│   ├── config.py            # Configuration
│   ├── dependencies.py      # FastAPI dependencies
│   ├── models/             # Pydantic models
│   │   ├── profile.py
│   │   └── container.py
│   ├── schemas/            # Request/response schemas
│   │   ├── profile.py
│   │   └── container.py
│   ├── services/           # Business logic
│   │   ├── profile_service.py
│   │   ├── container_service.py
│   │   └── aws_service.py
│   ├── routers/            # API routes
│   │   ├── profiles.py
│   │   └── containers.py
│   ├── middleware/         # Middleware
│   │   ├── auth.py
│   │   └── cors.py
│   ├── exceptions/         # Custom exceptions
│   │   └── handlers.py
│   └── utils/              # Utilities
│       └── validators.py
└── tests/
    ├── unit/
    └── integration/
```

### File Naming Rules
- **MUST** use lowercase with hyphens for TS/JS: `profile-manager.ts`
- **MUST** use snake_case for Python: `profile_manager.py`
- **MUST** use PascalCase for React components: `ProfileCard.tsx`
- **MUST** suffix test files with `.test.ts` or `_test.py`
- **MUST** suffix type definition files with `.d.ts`

---

## 6. Development Workflow

### Before Starting Work
1. **MUST** pull latest changes from main branch
2. **MUST** create a feature branch: `claude/feature-name-sessionId`
3. **MUST** understand the requirement fully
4. **MUST** check existing code for similar patterns

### During Development
1. **MUST** write tests before or alongside implementation
2. **MUST** run linters and formatters frequently
3. **MUST** test manually in browser/terminal
4. **MUST** keep commits small and focused
5. **MUST** write commit messages following Conventional Commits

### Before Committing
1. **MUST** run `yarn lint` (extension) or `ruff check` (API)
2. **MUST** run `yarn test` or `pytest`
3. **MUST** ensure no console.log statements remain
4. **MUST** ensure no commented code remains
5. **MUST** update documentation if APIs changed

### Commands Reference
```bash
# Extension
yarn install          # Install dependencies
yarn dev             # Development build with watch
yarn build           # Production build
yarn test            # Run tests
yarn lint            # Run ESLint
yarn format          # Run Prettier

# API Server
uv sync              # Install dependencies
uv run uvicorn src.main:app --reload  # Development server
uv run pytest        # Run tests
uv run ruff check    # Run linter
uv run mypy src      # Type checking
```

---

## 7. Testing Requirements

### Test Coverage Requirements
- **Minimum**: 70% overall coverage
- **Critical paths**: 90% coverage
- **New code**: Must maintain or improve coverage

### TypeScript Testing

#### Unit Tests
```typescript
// ✅ GOOD: Comprehensive test with setup and assertions
describe('ProfileService', () => {
  let service: ProfileService;
  let mockApiClient: jest.Mocked<ApiClient>;

  beforeEach(() => {
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    } as any;

    service = new ProfileService(mockApiClient);
  });

  describe('getProfile', () => {
    it('should fetch profile successfully', async () => {
      const mockProfile = { id: '1', name: 'Test' };
      mockApiClient.get.mockResolvedValue({ data: mockProfile });

      const result = await service.getProfile('1');

      expect(result).toEqual(mockProfile);
      expect(mockApiClient.get).toHaveBeenCalledWith('/profiles/1');
    });

    it('should throw error when profile not found', async () => {
      mockApiClient.get.mockRejectedValue(new Error('Not found'));

      await expect(service.getProfile('1')).rejects.toThrow();
    });
  });
});

// ❌ BAD: Incomplete test
describe('ProfileService', () => {
  it('works', async () => {
    const service = new ProfileService();
    const result = await service.getProfile('1');
    expect(result).toBeTruthy();
  });
});
```

#### Component Tests
```typescript
// ✅ GOOD: Testing behavior and user interactions
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

describe('ProfileCard', () => {
  const mockProfile = {
    id: '1',
    name: 'Test Profile',
    region: 'us-east-1'
  };

  const mockOnSelect = jest.fn();

  beforeEach(() => {
    mockOnSelect.mockClear();
  });

  it('should render profile information', () => {
    render(<ProfileCard profile={mockProfile} onSelect={mockOnSelect} />);

    expect(screen.getByText('Test Profile')).toBeInTheDocument();
    expect(screen.getByText('us-east-1')).toBeInTheDocument();
  });

  it('should call onSelect when clicked', async () => {
    render(<ProfileCard profile={mockProfile} onSelect={mockOnSelect} />);

    const button = screen.getByRole('button', { name: /select/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockOnSelect).toHaveBeenCalledWith('1');
    });
  });
});
```

### Python Testing

#### Unit Tests
```python
# ✅ GOOD: Comprehensive pytest with fixtures
import pytest
from unittest.mock import Mock, AsyncMock

@pytest.fixture
def profile_service():
    """Fixture providing a ProfileService instance with mocked dependencies."""
    mock_db = AsyncMock()
    return ProfileService(db=mock_db)

@pytest.fixture
def sample_profile():
    """Fixture providing a sample profile."""
    return Profile(
        id="profile-1",
        name="Test Profile",
        region="us-east-1"
    )

class TestProfileService:
    """Test suite for ProfileService."""

    @pytest.mark.asyncio
    async def test_get_profile_success(self, profile_service, sample_profile):
        """Test successful profile retrieval."""
        # Arrange
        profile_service.db.get_profile.return_value = sample_profile

        # Act
        result = await profile_service.get_profile("profile-1")

        # Assert
        assert result == sample_profile
        profile_service.db.get_profile.assert_called_once_with("profile-1")

    @pytest.mark.asyncio
    async def test_get_profile_not_found(self, profile_service):
        """Test profile not found error handling."""
        # Arrange
        profile_service.db.get_profile.return_value = None

        # Act & Assert
        with pytest.raises(ProfileNotFoundError):
            await profile_service.get_profile("nonexistent")

# ❌ BAD: Incomplete test
def test_profile():
    service = ProfileService()
    result = service.get_profile("1")
    assert result is not None
```

#### Integration Tests
```python
# ✅ GOOD: Full integration test with FastAPI TestClient
from fastapi.testclient import TestClient

@pytest.fixture
def client():
    """Fixture providing a test client."""
    return TestClient(app)

def test_create_profile_endpoint(client):
    """Test profile creation endpoint."""
    # Arrange
    profile_data = {
        "name": "Test Profile",
        "region": "us-east-1",
        "account_id": "123456789012"
    }

    # Act
    response = client.post(
        "/profiles",
        json=profile_data,
        headers={"Authorization": "Bearer test-token"}
    )

    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Profile"
    assert "id" in data
```

### Test Organization
- **MUST** mirror source structure in `__tests__` or `tests/`
- **MUST** use descriptive test names
- **MUST** follow AAA pattern: Arrange, Act, Assert
- **MUST** clean up after tests (fixtures, mocks)
- **SHOULD** use data-driven tests for multiple scenarios

---

## 8. Security Guidelines

### Critical Security Rules

#### Authentication and Authorization
```typescript
// ✅ GOOD: Token validation
async function callApi(endpoint: string): Promise<Response> {
  const token = await getSecureToken();

  if (!token) {
    throw new AuthenticationError("No valid token available");
  }

  return fetch(endpoint, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

// ❌ BAD: No authentication
async function callApi(endpoint: string): Promise<Response> {
  return fetch(endpoint);
}
```

#### Input Validation
```python
# ✅ GOOD: Pydantic validation
from pydantic import BaseModel, validator

class ProfileCreate(BaseModel):
    name: str
    region: str
    account_id: str

    @validator('name')
    def name_must_be_valid(cls, v):
        if not v or len(v) < 3:
            raise ValueError('Name must be at least 3 characters')
        if not re.match(r'^[a-zA-Z0-9-_]+$', v):
            raise ValueError('Name contains invalid characters')
        return v

    @validator('account_id')
    def account_id_must_be_valid(cls, v):
        if not re.match(r'^\d{12}$', v):
            raise ValueError('Account ID must be 12 digits')
        return v

# ❌ BAD: No validation
@app.post("/profiles")
async def create_profile(name: str, region: str, account_id: str):
    profile = Profile(name=name, region=region, account_id=account_id)
    await db.save(profile)
    return profile
```

#### Secrets Management
```typescript
// ✅ GOOD: Never log secrets
async function authenticateUser(credentials: Credentials): Promise<Token> {
  logger.info('Authenticating user', { username: credentials.username });
  // Note: NOT logging password

  const token = await authService.login(credentials);

  logger.info('Authentication successful', {
    username: credentials.username
    // Note: NOT logging token
  });

  return token;
}

// ❌ BAD: Logging secrets
async function authenticateUser(credentials: Credentials): Promise<Token> {
  logger.info('Authenticating', credentials); // Logs password!

  const token = await authService.login(credentials);

  logger.info('Token received', token); // Logs token!

  return token;
}
```

### Security Checklist
- [ ] All user input is validated
- [ ] SQL injection prevented (using ORMs/parameterized queries)
- [ ] XSS prevented (React auto-escapes, but be careful with dangerouslySetInnerHTML)
- [ ] CSRF protection enabled
- [ ] Secrets not in code or logs
- [ ] HTTPS enforced for production
- [ ] Authentication required for sensitive endpoints
- [ ] Authorization checks before data access
- [ ] Rate limiting implemented
- [ ] Error messages don't leak sensitive info

### Prohibited Security Practices
- ❌ NEVER commit secrets, tokens, or credentials
- ❌ NEVER use `eval()` or `Function()` constructor
- ❌ NEVER trust user input without validation
- ❌ NEVER log sensitive data (passwords, tokens, PII)
- ❌ NEVER use `dangerouslySetInnerHTML` without sanitization
- ❌ NEVER disable security features for convenience
- ❌ NEVER hardcode credentials or API keys
- ❌ NEVER use HTTP in production (must use HTTPS)

---

## 9. Performance Standards

### Browser Extension Performance

#### Bundle Size
- **Target**: < 2MB total extension size
- **Maximum**: 5MB
- **MUST** use code splitting for large features
- **MUST** lazy load non-critical components

```typescript
// ✅ GOOD: Lazy loading
const ProfileSettings = lazy(() => import('./components/ProfileSettings'));

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <ProfileSettings />
    </Suspense>
  );
}

// ❌ BAD: Loading everything upfront
import ProfileSettings from './components/ProfileSettings';
```

#### Rendering Performance
```typescript
// ✅ GOOD: Memoization
const ProfileList: React.FC<Props> = ({ profiles, onSelect }) => {
  const sortedProfiles = useMemo(() => {
    return [...profiles].sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles]);

  return (
    <div>
      {sortedProfiles.map(profile => (
        <ProfileCard key={profile.id} profile={profile} onSelect={onSelect} />
      ))}
    </div>
  );
};

// ❌ BAD: Re-sorting on every render
const ProfileList: React.FC<Props> = ({ profiles, onSelect }) => {
  const sortedProfiles = [...profiles].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <div>
      {sortedProfiles.map(profile => (
        <ProfileCard key={profile.id} profile={profile} onSelect={onSelect} />
      ))}
    </div>
  );
};
```

### API Server Performance

#### Response Time
- **Target**: < 100ms for simple queries
- **Maximum**: 500ms for complex operations
- **MUST** implement caching for frequent queries
- **MUST** use connection pooling

```python
# ✅ GOOD: Caching
from functools import lru_cache

@lru_cache(maxsize=100)
async def get_profile_cached(profile_id: str) -> Profile:
    """Get profile with caching."""
    return await db.get_profile(profile_id)

# ❌ BAD: No caching for frequently accessed data
async def get_profile(profile_id: str) -> Profile:
    return await db.get_profile(profile_id)
```

#### Database Queries
```python
# ✅ GOOD: Efficient query with indexes
async def get_user_profiles(user_id: str) -> List[Profile]:
    """Get all profiles for a user (uses index on user_id)."""
    return await db.profiles.find({"user_id": user_id}).to_list()

# ❌ BAD: N+1 query problem
async def get_profiles_with_containers() -> List[ProfileWithContainers]:
    profiles = await db.profiles.find().to_list()

    result = []
    for profile in profiles:
        # This creates N queries!
        containers = await db.containers.find({"profile_id": profile.id}).to_list()
        result.append(ProfileWithContainers(profile=profile, containers=containers))

    return result

# ✅ BETTER: Single query with aggregation
async def get_profiles_with_containers() -> List[ProfileWithContainers]:
    pipeline = [
        {
            "$lookup": {
                "from": "containers",
                "localField": "id",
                "foreignField": "profile_id",
                "as": "containers"
            }
        }
    ]
    return await db.profiles.aggregate(pipeline).to_list()
```

### Performance Checklist
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized
- [ ] Images optimized
- [ ] Debounced/throttled event handlers
- [ ] Database queries optimized with indexes
- [ ] API responses cached when appropriate
- [ ] Connection pooling configured
- [ ] Bundle analyzed for size

---

## 10. Documentation Requirements

### Code Documentation

#### TypeScript
```typescript
/**
 * Generates an AWS console URL for the given profile and service.
 *
 * @param profile - The AWS profile to use
 * @param service - The AWS service (e.g., 'ec2', 's3')
 * @param region - Optional AWS region (defaults to profile's region)
 * @returns The complete AWS console URL
 *
 * @example
 * ```typescript
 * const url = generateConsoleUrl(
 *   { id: '1', name: 'prod', region: 'us-east-1' },
 *   'ec2'
 * );
 * // Returns: https://console.aws.amazon.com/ec2?region=us-east-1#
 * ```
 */
export function generateConsoleUrl(
  profile: Profile,
  service: string,
  region?: string
): string {
  const targetRegion = region || profile.region;
  return `https://console.aws.amazon.com/${service}?region=${targetRegion}#`;
}
```

#### Python
```python
async def create_profile(
    profile_data: ProfileCreate,
    user_id: str
) -> Profile:
    """
    Create a new AWS profile for a user.

    Args:
        profile_data: Profile creation data including name, region, and account ID
        user_id: The ID of the user creating the profile

    Returns:
        Profile: The newly created profile with generated ID

    Raises:
        ProfileAlreadyExistsError: If a profile with the same name exists
        ValidationError: If profile data is invalid
        DatabaseError: If database operation fails

    Example:
        >>> profile = await create_profile(
        ...     ProfileCreate(name="prod", region="us-east-1", account_id="123456789012"),
        ...     user_id="user-1"
        ... )
        >>> print(profile.id)
        'profile-abc123'
    """
    # Implementation
```

### Documentation Requirements
- **MUST** document all public APIs
- **MUST** document complex algorithms
- **SHOULD** document non-obvious code
- **MUST** include examples for public functions
- **MUST** document error cases
- **MUST** keep comments up-to-date with code

### README Updates
When changing functionality, **MUST** update:
- [ ] README.md if user-facing changes
- [ ] API documentation if API changes
- [ ] Architecture docs if design changes
- [ ] User guide if workflows change

---

## 11. Git Commit Standards

### Conventional Commits Format
**MUST** follow: `<type>(<scope>): <subject>`

### Commit Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples
```bash
# ✅ GOOD
feat(profiles): add profile export functionality
fix(api): resolve token expiration handling
docs(readme): update installation instructions
refactor(containers): simplify container creation logic
test(profiles): add tests for profile deletion
chore(deps): upgrade react to 19.2.0

# ❌ BAD
update stuff
fix bug
WIP
asdf
```

### Commit Message Rules
- **MUST** use present tense ("add" not "added")
- **MUST** use imperative mood ("move" not "moves")
- **MUST** not capitalize first letter of subject
- **MUST** not end subject with period
- **SHOULD** include scope (component/module affected)
- **SHOULD** wrap body at 72 characters
- **MUST** separate subject from body with blank line

### Breaking Changes
```bash
# Format for breaking changes
feat(api)!: change profile API response structure

BREAKING CHANGE: Profile API now returns nested container objects
instead of container IDs. Update client code to handle new structure.

Migration:
- Old: profile.containerIds: string[]
- New: profile.containers: Container[]
```

---

## 12. Error Handling

### TypeScript Error Handling

#### Custom Errors
```typescript
// ✅ GOOD: Custom error classes
export class ProfileNotFoundError extends Error {
  constructor(profileId: string) {
    super(`Profile ${profileId} not found`);
    this.name = 'ProfileNotFoundError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

// Usage
async function getProfile(id: string): Promise<Profile> {
  const profile = await api.get(`/profiles/${id}`);

  if (!profile) {
    throw new ProfileNotFoundError(id);
  }

  return profile;
}
```

#### Error Boundaries
```typescript
// ✅ GOOD: React error boundary
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logger.error('Component error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorDisplay error={this.state.error} />;
    }

    return this.props.children;
  }
}
```

#### Try-Catch Guidelines
```typescript
// ✅ GOOD: Specific error handling
async function saveProfile(profile: Profile): Promise<void> {
  try {
    await api.post('/profiles', profile);
  } catch (error) {
    if (error instanceof NetworkError) {
      // Handle network errors
      throw new ProfileSaveError('Network error saving profile', error);
    } else if (error instanceof ValidationError) {
      // Handle validation errors
      throw new ProfileValidationError(error.message);
    } else {
      // Unknown error
      logger.error('Unexpected error saving profile:', error);
      throw new ProfileSaveError('Failed to save profile', error);
    }
  }
}

// ❌ BAD: Swallowing errors
async function saveProfile(profile: Profile): Promise<void> {
  try {
    await api.post('/profiles', profile);
  } catch (error) {
    console.log('Error:', error);
    // Error swallowed, caller doesn't know it failed!
  }
}
```

### Python Error Handling

#### Custom Exceptions
```python
# ✅ GOOD: Custom exception hierarchy
class AWSContainersError(Exception):
    """Base exception for AWS Containers."""
    pass

class ProfileError(AWSContainersError):
    """Profile-related errors."""
    pass

class ProfileNotFoundError(ProfileError):
    """Profile not found."""

    def __init__(self, profile_id: str):
        self.profile_id = profile_id
        super().__init__(f"Profile {profile_id} not found")

class ProfileAlreadyExistsError(ProfileError):
    """Profile already exists."""

    def __init__(self, name: str):
        self.name = name
        super().__init__(f"Profile with name '{name}' already exists")
```

#### FastAPI Error Handlers
```python
# ✅ GOOD: Centralized error handling
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse

@app.exception_handler(ProfileNotFoundError)
async def profile_not_found_handler(
    request: Request,
    exc: ProfileNotFoundError
) -> JSONResponse:
    """Handle ProfileNotFoundError."""
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={
            "error": "profile_not_found",
            "message": str(exc),
            "profile_id": exc.profile_id
        }
    )

@app.exception_handler(ValidationError)
async def validation_error_handler(
    request: Request,
    exc: ValidationError
) -> JSONResponse:
    """Handle Pydantic ValidationError."""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error": "validation_error",
            "message": "Invalid input data",
            "details": exc.errors()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(
    request: Request,
    exc: Exception
) -> JSONResponse:
    """Handle unexpected errors."""
    logger.error(f"Unexpected error: {exc}", exc_info=True)

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "internal_server_error",
            "message": "An unexpected error occurred"
        }
    )
```

### Error Handling Rules
- **MUST** never swallow errors silently
- **MUST** log errors with context
- **MUST** provide user-friendly error messages
- **MUST NOT** expose internal details in error messages
- **SHOULD** use custom error types
- **SHOULD** handle errors at appropriate levels

---

## 13. API Design Principles

### RESTful Conventions

#### Resource Naming
```
✅ GOOD
GET    /profiles              # List profiles
GET    /profiles/{id}         # Get specific profile
POST   /profiles              # Create profile
PUT    /profiles/{id}         # Update profile (full)
PATCH  /profiles/{id}         # Update profile (partial)
DELETE /profiles/{id}         # Delete profile

GET    /profiles/{id}/containers  # List profile's containers

❌ BAD
GET    /getProfiles
GET    /profile?id=123
POST   /createProfile
POST   /profiles/delete/{id}
GET    /profileContainers/{profileId}
```

#### HTTP Status Codes
```python
# ✅ GOOD: Appropriate status codes
@app.post("/profiles", status_code=status.HTTP_201_CREATED)
async def create_profile(profile: ProfileCreate) -> ProfileResponse:
    """Create profile - returns 201 Created."""
    pass

@app.get("/profiles/{id}", status_code=status.HTTP_200_OK)
async def get_profile(id: str) -> ProfileResponse:
    """Get profile - returns 200 OK."""
    pass

@app.delete("/profiles/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_profile(id: str) -> None:
    """Delete profile - returns 204 No Content."""
    pass

# Error responses
# 400 Bad Request - Client error
# 401 Unauthorized - Not authenticated
# 403 Forbidden - Not authorized
# 404 Not Found - Resource doesn't exist
# 422 Unprocessable Entity - Validation error
# 500 Internal Server Error - Server error
```

### Request/Response Format

#### Request Bodies
```python
# ✅ GOOD: Validated request models
class ProfileCreate(BaseModel):
    """Request model for creating a profile."""
    name: str = Field(..., min_length=3, max_length=50)
    region: str = Field(..., regex=r'^[a-z]{2}-[a-z]+-\d$')
    account_id: str = Field(..., regex=r'^\d{12}$')

    class Config:
        schema_extra = {
            "example": {
                "name": "production",
                "region": "us-east-1",
                "account_id": "123456789012"
            }
        }
```

#### Response Bodies
```python
# ✅ GOOD: Consistent response format
class ProfileResponse(BaseModel):
    """Response model for profile."""
    id: str
    name: str
    region: str
    account_id: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_profile(cls, profile: Profile) -> "ProfileResponse":
        """Convert Profile to ProfileResponse."""
        return cls(
            id=profile.id,
            name=profile.name,
            region=profile.region,
            account_id=profile.account_id,
            created_at=profile.created_at,
            updated_at=profile.updated_at
        )

class ErrorResponse(BaseModel):
    """Standard error response."""
    error: str
    message: str
    details: Optional[dict] = None
```

### API Versioning
```python
# ✅ GOOD: Version in URL
@app.get("/api/v1/profiles")
async def get_profiles_v1():
    pass

@app.get("/api/v2/profiles")
async def get_profiles_v2():
    pass

# Alternative: Version in header
@app.get("/api/profiles")
async def get_profiles(api_version: str = Header("1.0")):
    if api_version == "1.0":
        # V1 logic
        pass
    elif api_version == "2.0":
        # V2 logic
        pass
```

---

## 14. Browser Extension Guidelines

### Manifest Permissions
```json
{
  "permissions": [
    "storage",        // ✅ Needed for profile storage
    "tabs",          // ✅ Needed for tab management
    "cookies",       // ✅ Needed for session management
    "<all_urls>"     // ❌ Too broad! Use specific patterns
  ],

  "host_permissions": [
    "https://*.amazonaws.com/*",  // ✅ Specific pattern
    "https://console.aws.amazon.com/*"  // ✅ Specific pattern
  ]
}
```

### Storage Guidelines
```typescript
// ✅ GOOD: Type-safe storage
interface StorageData {
  profiles: Profile[];
  settings: Settings;
  lastSync: number;
}

async function saveProfiles(profiles: Profile[]): Promise<void> {
  await browser.storage.local.set({ profiles });
}

async function getProfiles(): Promise<Profile[]> {
  const data = await browser.storage.local.get('profiles');
  return data.profiles || [];
}

// ❌ BAD: Untyped storage
async function saveData(key: string, value: any): Promise<void> {
  await browser.storage.local.set({ [key]: value });
}
```

### Background Scripts
```typescript
// ✅ GOOD: Efficient background script
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'GET_PROFILE') {
    return handleGetProfile(message.profileId);
  } else if (message.type === 'SAVE_PROFILE') {
    return handleSaveProfile(message.profile);
  }

  return Promise.resolve(null);
});

// ❌ BAD: Blocking operations, poor structure
browser.runtime.onMessage.addListener((message, sender) => {
  // Synchronous operation - blocks!
  const data = someBlockingOperation();

  // No type checking
  if (message.action === 'do_something') {
    doSomething(message.data);
  }
});
```

### Content Scripts
```typescript
// ✅ GOOD: Isolated content script
(function() {
  'use strict';

  // Isolated scope
  const AWS_CONSOLE_PATTERN = /console\.aws\.amazon\.com/;

  if (AWS_CONSOLE_PATTERN.test(window.location.href)) {
    injectConsoleEnhancements();
  }

  function injectConsoleEnhancements(): void {
    // Enhancement logic
  }
})();

// ❌ BAD: Polluting global scope
const globalVar = 'something';  // Accessible to page scripts!

function doSomething() {  // Accessible to page scripts!
  // ...
}
```

---

## 15. Python API Server Guidelines

### Async/Await
```python
# ✅ GOOD: Fully async
@app.get("/profiles/{id}")
async def get_profile(id: str) -> ProfileResponse:
    """Get profile - fully async."""
    profile = await profile_service.get_profile(id)
    return ProfileResponse.from_profile(profile)

async def get_profile_from_db(profile_id: str) -> Profile:
    """Database access - async."""
    return await db.profiles.find_one({"id": profile_id})

# ❌ BAD: Mixing sync and async
@app.get("/profiles/{id}")
async def get_profile(id: str) -> ProfileResponse:
    # This blocks the event loop!
    profile = sync_database_call(id)
    return ProfileResponse.from_profile(profile)
```

### Dependency Injection
```python
# ✅ GOOD: Using FastAPI dependencies
from fastapi import Depends

async def get_current_user(
    token: str = Depends(oauth2_scheme)
) -> User:
    """Dependency to get current authenticated user."""
    user = await verify_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    return user

@app.get("/profiles")
async def get_profiles(
    current_user: User = Depends(get_current_user)
) -> List[ProfileResponse]:
    """Get profiles for current user."""
    profiles = await profile_service.get_user_profiles(current_user.id)
    return [ProfileResponse.from_profile(p) for p in profiles]

# ❌ BAD: No dependency injection
@app.get("/profiles")
async def get_profiles(token: str) -> List[ProfileResponse]:
    # Duplicate auth logic in every endpoint
    user = await verify_token(token)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")

    profiles = await profile_service.get_user_profiles(user.id)
    return [ProfileResponse.from_profile(p) for p in profiles]
```

### Logging
```python
# ✅ GOOD: Structured logging
import logging

logger = logging.getLogger(__name__)

async def create_profile(profile_data: ProfileCreate) -> Profile:
    """Create profile with proper logging."""
    logger.info(
        "Creating profile",
        extra={
            "profile_name": profile_data.name,
            "region": profile_data.region
        }
    )

    try:
        profile = await db.create_profile(profile_data)

        logger.info(
            "Profile created successfully",
            extra={"profile_id": profile.id}
        )

        return profile

    except Exception as e:
        logger.error(
            "Failed to create profile",
            extra={
                "profile_name": profile_data.name,
                "error": str(e)
            },
            exc_info=True
        )
        raise

# ❌ BAD: Print statements, no structure
async def create_profile(profile_data: ProfileCreate) -> Profile:
    print(f"Creating profile: {profile_data.name}")

    try:
        profile = await db.create_profile(profile_data)
        print(f"Created: {profile.id}")
        return profile
    except Exception as e:
        print(f"Error: {e}")
        raise
```

---

## 16. Dependencies Management

### Adding Dependencies

#### NPM (Extension)
```bash
# ✅ GOOD: Justify and document
# Add to package.json with specific version
yarn add react-query@^5.0.0

# Document in commit message:
# chore(deps): add react-query for efficient data fetching
#
# Adds react-query to handle server state management,
# reducing boilerplate and improving caching.
```

#### Python (API Server)
```bash
# ✅ GOOD: Use uv for dependency management
uv add fastapi

# Document in commit message:
# chore(deps): add fastapi dependency
#
# Adds fastapi for web framework capabilities
```

### Version Pinning
```json
// package.json
{
  "dependencies": {
    "react": "19.2.0",              // ✅ Exact version for stability
    "react-dom": "19.2.0"
  },
  "devDependencies": {
    "typescript": "^5.7.2",          // ✅ Caret for dev tools
    "@types/react": "^19.0.0"
  }
}
```

```toml
# pyproject.toml
[project]
dependencies = [
    "fastapi>=0.104.0,<0.105.0",    # ✅ Range for compatibility
    "uvicorn[standard]>=0.24.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "ruff>=0.1.0",
]
```

### Security Updates
- **MUST** review and address Dependabot alerts within 7 days
- **MUST** update vulnerable dependencies immediately
- **SHOULD** regularly update dependencies (monthly)
- **MUST** test after dependency updates

---

## 17. Build and Deployment

### Extension Build
```bash
# Development
yarn dev          # Watch mode, source maps, unminified

# Production
yarn build        # Minified, optimized, ready for distribution

# Validation
web-ext lint      # Validate extension structure
```

### API Server Deployment
```bash
# Development
uv run uvicorn src.main:app --reload --port 8000

# Production
uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --workers 4

# With systemd (Linux)
systemctl start aws-containers-api
systemctl enable aws-containers-api

# With launchd (macOS)
launchctl load ~/Library/LaunchAgents/com.aws-containers.api.plist
```

### CI/CD Pipeline
```yaml
# .github/workflows/build-extension.yml
name: Build Extension

on: [pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: yarn install
      - run: yarn lint        # ✅ Must pass
      - run: yarn test        # ✅ Must pass
      - run: yarn build       # ✅ Must succeed
```

---

## 18. Common Pitfalls to Avoid

### TypeScript/React

#### Pitfall: Unnecessary Re-renders
```typescript
// ❌ BAD: Creates new function on every render
function Component({ onSave }) {
  return <Button onClick={() => onSave()}>Save</Button>;
}

// ✅ GOOD: Memoized callback
function Component({ onSave }) {
  const handleClick = useCallback(() => {
    onSave();
  }, [onSave]);

  return <Button onClick={handleClick}>Save</Button>;
}
```

#### Pitfall: Mutating State
```typescript
// ❌ BAD: Mutating state directly
function addProfile(newProfile: Profile) {
  profiles.push(newProfile);  // Mutation!
  setProfiles(profiles);      // React won't detect change
}

// ✅ GOOD: Creating new array
function addProfile(newProfile: Profile) {
  setProfiles([...profiles, newProfile]);
}
```

#### Pitfall: Missing Dependencies
```typescript
// ❌ BAD: Missing dependency
useEffect(() => {
  fetchProfile(profileId);
}, []);  // profileId not in dependency array!

// ✅ GOOD: All dependencies included
useEffect(() => {
  fetchProfile(profileId);
}, [profileId]);
```

### Python/FastAPI

#### Pitfall: Blocking Operations
```python
# ❌ BAD: Blocking the event loop
@app.get("/profiles/{id}")
async def get_profile(id: str):
    # Blocking database call!
    profile = db.get_profile(id)
    return profile

# ✅ GOOD: Async all the way
@app.get("/profiles/{id}")
async def get_profile(id: str):
    profile = await db.get_profile(id)
    return profile
```

#### Pitfall: Missing Type Hints
```python
# ❌ BAD: No type hints
async def get_profile(id):
    return await db.get_profile(id)

# ✅ GOOD: Full type hints
async def get_profile(id: str) -> Profile:
    return await db.get_profile(id)
```

---

## 19. Code Review Checklist

### Before Requesting Review
- [ ] Code follows style guidelines
- [ ] All tests pass
- [ ] Test coverage maintained/improved
- [ ] No linting errors
- [ ] No console.log or print statements
- [ ] Documentation updated
- [ ] Commit messages follow conventions
- [ ] No sensitive data in code
- [ ] Performance considered
- [ ] Error handling implemented
- [ ] Accessibility considered (for UI)
- [ ] Cross-browser tested (for extension)

### Reviewer Checklist
- [ ] Code solves the stated problem
- [ ] Implementation is clean and maintainable
- [ ] No obvious bugs
- [ ] Edge cases handled
- [ ] Tests are adequate
- [ ] Documentation is clear
- [ ] Security implications considered
- [ ] Performance implications considered
- [ ] Breaking changes documented

---

## 20. Prohibited Practices

### Absolutely Forbidden

#### Security
- ❌ Committing secrets or credentials
- ❌ Using eval() or similar unsafe functions
- ❌ Disabling security features
- ❌ Logging sensitive data
- ❌ Trusting user input without validation

#### Code Quality
- ❌ Commented-out code in commits
- ❌ console.log / print statements in production code
- ❌ TODO comments without tickets
- ❌ Magic numbers without constants
- ❌ Copy-paste code (DRY principle)

#### Git
- ❌ Force pushing to main/master
- ❌ Committing directly to main/master
- ❌ Large binary files in git
- ❌ Merge commits (use rebase)
- ❌ WIP commits in final PR

#### Testing
- ❌ Skipping tests with `.skip` or `.only` in commits
- ❌ Tests that depend on external services
- ❌ Tests without assertions
- ❌ Flaky tests (fix or remove)

#### Dependencies
- ❌ Installing dependencies without justification
- ❌ Using deprecated packages
- ❌ Ignoring security vulnerabilities
- ❌ Not pinning versions

---

## Appendix A: Quick Reference

### Commands Cheatsheet
```bash
# Extension Development
yarn install          # Install dependencies
yarn dev             # Development build (watch mode)
yarn build           # Production build
yarn test            # Run tests
yarn test:watch      # Run tests in watch mode
yarn lint            # Run linter
yarn lint:fix        # Fix linting issues
yarn format          # Format code

# API Server Development
uv sync              # Install dependencies
uv run uvicorn src.main:app --reload  # Dev server
uv run pytest        # Run tests
uv run pytest -v     # Verbose tests
uv run pytest --cov  # With coverage
uv run ruff check    # Lint
uv run ruff format   # Format
uv run mypy src      # Type check

# Git
git status                    # Check status
git add .                     # Stage changes
git commit -m "type: message" # Commit
git push -u origin branch     # Push to remote
```

### File Naming Quick Reference
| Type | Convention | Example |
|------|------------|---------|
| React Component | PascalCase.tsx | `ProfileCard.tsx` |
| TypeScript Module | kebab-case.ts | `profile-service.ts` |
| Python Module | snake_case.py | `profile_service.py` |
| Test File (TS) | kebab-case.test.ts | `profile-service.test.ts` |
| Test File (Py) | test_snake_case.py | `test_profile_service.py` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |

---

## Appendix B: Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [WebExtension API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Cloudscape Design System](https://cloudscape.design/)

### Tools
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)
- [ESLint](https://eslint.org/)
- [Prettier](https://prettier.io/)
- [Jest](https://jestjs.io/)
- [pytest](https://docs.pytest.org/)
- [Ruff](https://docs.astral.sh/ruff/)

---

## Document Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-18 | Initial comprehensive agentic coding rules |

---

**END OF DOCUMENT**

This document is the authoritative guide for all AI coding agents working on AWS Profile Containers. When in doubt, refer to this document. When this document doesn't cover a situation, follow industry best practices and create a PR to update this guide.
