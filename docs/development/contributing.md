# Contributing Guide

Thank you for your interest in contributing to AWS Profile Containers!

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/aws-containers.git
   cd aws-containers
   ```
3. Install dependencies:
   ```bash
   npm install
   pip install -r native-messaging/requirements.txt
   ```

## Development Workflow

### Extension Development

1. Make changes to source files in `src/`
2. Build:
   ```bash
   npm run build
   # Or for watch mode:
   npm run dev
   ```
3. Load in Firefox: `about:debugging` → Load Temporary Add-on → select `dist/manifest.json`
4. Test your changes
5. Reload extension after each build

### Native Host Development

1. Make changes to Python source in `native-messaging/src/`
2. Test changes:
   ```bash
   python -m pytest native-messaging/tests/
   ```
3. Build standalone executable (optional):
   ```bash
   ./build-native-host.sh
   ```
4. Install and test:
   ```bash
   ./install.sh
   ```

## Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow existing code style
- Run linter:
  ```bash
  npm run lint
  ```

### Python

- Follow PEP 8
- Use type hints
- Write docstrings
- Run tests:
  ```bash
  pytest native-messaging/tests/
  ```

## Testing

### Extension Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch
```

### Native Host Tests

```bash
# Run all tests
cd native-messaging
pytest

# With coverage
pytest --cov=src/aws_profile_bridge --cov-report=html
```

## Pull Requests

1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Run tests
4. Commit with clear messages:
   ```bash
   git commit -m "feat: add new feature"
   ```
5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Open a pull request on GitHub

## Commit Messages

Follow conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `test:` - Test changes
- `refactor:` - Code refactoring
- `chore:` - Maintenance tasks

## Code Review

All pull requests require review. Please:
- Keep PRs focused and small
- Write clear descriptions
- Respond to feedback
- Update based on review comments

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

See [LICENSE](../../LICENSE) for details.
