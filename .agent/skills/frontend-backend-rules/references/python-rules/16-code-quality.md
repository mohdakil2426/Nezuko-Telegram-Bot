# 16. Code Quality & Linting (Ruff, Pylint)

## Ruff Configuration

**RULE: Use Ruff for linting. Enable strict rules. Fix automatically where possible.**

```toml
# ✅ CORRECT: pyproject.toml Ruff configuration
[tool.ruff]
line-length = 100
target-version = "py313"

[tool.ruff.lint]
# Start strict: enable most rules
select = [
    "E",      # pycodestyle errors
    "W",      # pycodestyle warnings
    "F",      # Pyflakes
    "I",      # isort import sorting
    "C",      # flake8-comprehensions
    "B",      # flake8-bugbear
    "A",      # flake8-builtins
    "C4",     # flake8-comprehensions
    "PIE",    # flake8-pie
    "SIM",    # flake8-simplify
    "RUF",    # Ruff-specific rules
    "ASYNC",  # flake8-async (async-related issues)
    "UP",     # pyupgrade - Python upgrade checks (3.13+)
    "S",      # flake8-bandit - Security issues
    "PTH",    # flake8-use-pathlib - Modern path handling
    "TCH",    # flake8-type-checking - TYPE_CHECKING blocks
    "TID",    # flake8-tidy-imports - Import organization
    "Q",      # flake8-quotes - Quote consistency
    "RET",    # flake8-return - Return statement checks
]

# Selectively ignore rules that don't fit project style
ignore = [
    "E501",   # Line too long (handled by formatter)
    "E741",   # Ambiguous variable names (sometimes unavoidable)
    "SIM105", # Use contextlib.suppress (subjective)
    "S101",   # Assert statements (used in tests)
    "S311",   # Standard pseudo-random generators (acceptable for non-crypto)
]

# Per-file ignores for tests
[tool.ruff.lint.per-file-ignores]
"tests/**" = ["F841", "S101", "S105", "S106"]  # Allow assert, assigned but unused

[tool.ruff.lint.isort]
known-first-party = ["app"]
known-third-party = ["fastapi", "pydantic", "sqlalchemy"]

[tool.ruff.lint.pydocstyle]
convention = "google"
```

## Pylint Configuration

**RULE: Use Pylint as secondary check. Focus on logic errors, unused code, and complexity.**

```ini
# ✅ CORRECT: .pylintrc configuration
[MASTER]
jobs = 0  # Use all cores
load-plugins = pylint_blocking_calls
extension-pkg-whitelist = pydantic,sqlalchemy

[MESSAGES CONTROL]
disable = 
    missing-docstring,     # Subjective
    too-many-arguments,    # Sometimes necessary
    too-few-public-methods,# OK for small classes
    fixme,                 # TODOs are fine

[DESIGN]
max-attributes = 7
max-arguments = 6
max-lines = 300

[BASIC]
good-names = i,j,k,ex,Run,_,id
```

## Pyrefly Type Checker Configuration

**RULE: Use Pyrefly as an alternative to mypy for faster type checking.**

```toml
# ✅ CORRECT: pyproject.toml Pyrefly configuration
[tool.pyrefly]
python_version = "3.13"
untyped_def_behavior = "check-and-infer-return-any"

[tool.pyrefly.ignore]
# Ignore specific error types globally
errors = ["missing-import"]

# Per-file ignores
[tool.pyrefly.ignore_paths]
paths = ["tests/**", "migrations/**"]
```

```bash
# Run Pyrefly type checking
pyrefly check

# Check with summary
pyrefly check --summarize-errors

# Remove unused ignore comments
pyrefly check --remove-unused-ignores
```

## Running Checks

**RULE: Run checks in CI/CD. Enforce on commit with pre-commit hooks.**

```yaml
# ✅ CORRECT: .pre-commit-config.yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.8.0
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format

  - repo: https://github.com/pylint-dev/pylint
    rev: v3.3.0
    hooks:
      - id: pylint
        args: [--jobs=0]
        additional_dependencies: [pylint-blocking-calls]

  - repo: local
    hooks:
      - id: pyrefly
        name: pyrefly
        entry: pyrefly check
        language: system
        types: [python]
        pass_filenames: false
        always_run: true
```

## GitHub Actions CI/CD Pipeline

**RULE: Use GitHub Actions for automated testing and linting.**

```yaml
# ✅ CORRECT: .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      
      - name: Install Ruff
        run: pip install ruff
      
      - name: Run Ruff
        run: ruff check .
      
      - name: Run Ruff Format Check
        run: ruff format --check .
      
      - name: Install Pyrefly
        run: pip install pyrefly
      
      - name: Run Pyrefly
        run: pyrefly check

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.13'
      
      - name: Install dependencies
        run: |
          pip install -r requirements.txt
          pip install -r requirements-dev.txt
      
      - name: Run tests
        run: pytest --cov=app --cov-report=xml
        env:
          DATABASE_URL: postgresql+asyncpg://postgres:postgres@localhost/postgres
          REDIS_URL: redis://localhost:6379
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```
