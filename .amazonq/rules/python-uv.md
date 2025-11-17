# Python Virtual Environment Rule

**CRITICAL: Always use UV for Python virtual environments in this project.**

## Commands

- **Run Python scripts**: `uv run python <script>`
- **Run pytest**: `uv run pytest <args>`
- **Install packages**: `uv pip install <package>`
- **Sync dependencies**: `uv sync`

## Never Use

- ❌ `python` or `python3` directly
- ❌ `pip install` directly
- ❌ `pytest` directly

## Always Use

- ✅ `uv run python`
- ✅ `uv run pytest`
- ✅ `uv pip install`
