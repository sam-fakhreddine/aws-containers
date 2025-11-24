# Testing Guide

Guide to running and writing tests for AWS Profile Containers.

## Test Coverage

**Current Coverage:** 84.74% statements, 72.42% branches, 77.22% functions, 85.69% lines

The project maintains high test coverage across all modules:
- ✅ 722 passing tests across 39 test suites
- ✅ All critical paths tested
- ✅ No modules with 0% coverage
- ✅ Coverage thresholds enforced in CI

📊 **[View Full Coverage Report](.kiro/specs/wxt-test-fixes/FINAL_COVERAGE_REPORT.md)**

## Extension Tests

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# With coverage
npm test -- --coverage

# Run specific test file
npm test -- src/hooks/__tests__/useProfiles.test.ts

# Run tests matching pattern
npm test -- -t "should load profiles"
```

### Test Files

- `src/**/*.test.tsx` - React component tests
- `src/**/*.test.ts` - TypeScript unit tests
- `src/__testUtils__/` - Test helpers
- `src/__mocks__/` - Mock implementations

### Framework

- **Jest** - Test runner
- **React Testing Library** - Component testing
- **@testing-library/user-event** - User interactions

### Example Test

```typescript
import { render, screen } from '@testing-library/react';
import { AWSProfiles } from './awsProfiles';

test('renders profile list', () => {
  render(<AWSProfiles />);
  expect(screen.getByText('AWS Profiles')).toBeInTheDocument();
});
```

## Native Host Tests

### Running Tests

```bash
cd api-server

# Run all tests
pytest

# With coverage
pytest --cov=src/aws_profile_bridge --cov-report=html

# Specific test file
pytest tests/test_file_parsers.py

# Specific test
pytest tests/test_file_parsers.py::TestFileCache::test_cache_stores_data
```

### Test Files

- `tests/test_file_parsers.py`
- `tests/test_sso_manager.py`
- `tests/test_credential_provider.py`
- `tests/test_console_url_generator.py`
- `tests/test_native_messaging.py`

### Framework

- **pytest** - Test framework
- **unittest.mock** - Mocking
- **tempfile** - Temporary files

### Coverage Target

- Target: 75%+
- Current: 75%+

### Example Test

```python
def test_parses_credentials_file():
    parser = CredentialsFileParser()
    with patch('builtins.open', mock_open(read_data=SAMPLE_CREDS)):
        profiles = parser.parse(Path('~/.aws/credentials'))
    assert len(profiles) > 0
    assert profiles[0]['name'] == 'default'
```

## Integration Testing

### Manual Testing

1. Build extension:
   ```bash
   npm run build
   ```

2. Build native host:
   ```bash
   ./build-native-host.sh
   ```

3. Install:
   ```bash
   ./install.sh
   ```

4. Load in Firefox and test manually

### Test Native Messaging

```bash
# Test native host communication
./test-api-server.sh
```

Expected output: JSON list of profiles

## Writing Tests

### Extension Tests

1. Create `*.test.tsx` or `*.test.ts` file
2. Import component/module
3. Write test cases
4. Run `npm test`

### Native Host Tests

1. Create `test_*.py` file in `tests/`
2. Write test functions
3. Mock file I/O and network calls
4. Run `pytest`

## Continuous Integration

Tests run automatically on:
- Pull requests
- Commits to main branch

See `.github/workflows/` for CI configuration.

## Best Practices

- Write tests for new features
- Mock external dependencies
- Test edge cases
- Keep tests fast
- Use descriptive test names

## Next Steps

- [Contributing Guide](contributing.md)
- [Architecture](architecture.md)
- [Building Guide](building.md)
