# Migration Guide - Python Refactoring

## Quick Reference

### Import Changes

| Old Import | New Import |
|------------|------------|
| `from aws_profile_bridge.aws_profile_bridge import AWSProfileBridge` | `from aws_profile_bridge.core.bridge import AWSProfileBridge` |
| `from aws_profile_bridge.debug_logger import get_logger` | `from aws_profile_bridge.utils.logger import get_logger` |
| `from aws_profile_bridge.file_parsers import *` | `from aws_profile_bridge.core.parsers import *` |
| `from aws_profile_bridge.console_url_generator import *` | `from aws_profile_bridge.core.console_url import *` |
| `from aws_profile_bridge.credential_provider import *` | `from aws_profile_bridge.core.credentials import *` |
| `from aws_profile_bridge.profile_metadata import *` | `from aws_profile_bridge.core.metadata import *` |
| `from aws_profile_bridge.sso_manager import *` | `from aws_profile_bridge.services.sso import *` |
| `from aws_profile_bridge.routes import *` | `from aws_profile_bridge.api import *` |

### Module Location Changes

```
OLD LOCATION                    →  NEW LOCATION
─────────────────────────────────────────────────────────────
aws_profile_bridge.py           →  core/bridge.py
api_server.py                   →  app.py
console_url_generator.py        →  core/console_url.py
credential_provider.py          →  core/credentials.py
debug_logger.py                 →  utils/logger.py
file_parsers.py                 →  core/parsers.py
logging_config.py               →  config/logging.py
profile_metadata.py             →  core/metadata.py
sso_manager.py                  →  services/sso.py
routes/                         →  api/
```

## No Changes Required For:

✅ **Command-line usage** - All CLI commands work exactly the same:
```bash
python -m aws_profile_bridge api
python -m aws_profile_bridge --version
python -m aws_profile_bridge --help
```

✅ **Package-level imports** - These still work:
```python
from aws_profile_bridge import AWSProfileBridge, main
```

✅ **Configuration files** - No changes to:
- `~/.aws/credentials`
- `~/.aws/config`
- `~/.aws/profile_bridge_config.json`

✅ **API endpoints** - All HTTP endpoints unchanged:
- `GET /health`
- `GET /profiles`
- `POST /profiles/{profile_name}/console-url`

## Testing Your Code

After updating imports, verify everything works:

```bash
# Test imports
python3 -c "from aws_profile_bridge.core.bridge import AWSProfileBridge; print('✓')"

# Test CLI
python3 -m aws_profile_bridge --version

# Test API server (if applicable)
python3 -m aws_profile_bridge api
```

## Common Issues

### Issue: `ModuleNotFoundError: No module named 'aws_profile_bridge.aws_profile_bridge'`

**Solution:** Update import to:
```python
from aws_profile_bridge.core.bridge import AWSProfileBridge
```

### Issue: `ImportError: cannot import name 'get_logger' from 'aws_profile_bridge.debug_logger'`

**Solution:** Update import to:
```python
from aws_profile_bridge.utils.logger import get_logger
```

### Issue: Old test files failing

**Solution:** Update test imports to match new structure. See `tests/test_bridge.py` for examples.

## Benefits of New Structure

1. **Clearer organization** - Business logic in `core/`, services in `services/`, API in `api/`
2. **Shorter names** - `parsers.py` instead of `file_parsers.py`
3. **Standard conventions** - `app.py` for FastAPI, `utils/` for utilities
4. **Better maintainability** - Easier to find and modify code
5. **Scalability** - Clear place for new features

## Need Help?

Check `REFACTORING_SUMMARY.md` for detailed changes or open an issue on GitHub.
