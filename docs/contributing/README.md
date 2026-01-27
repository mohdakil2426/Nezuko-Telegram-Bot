# 🤝 Contributing Guide

> **How to contribute to the Nezuko project**

We welcome contributions from the community! This guide will help you get started with development and understand our workflow.

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Code Style](#code-style)
4. [Git Workflow](#git-workflow)
5. [Testing](#testing)
6. [Pull Request Process](#pull-request-process)
7. [Architecture Guidelines](#architecture-guidelines)

---

## Getting Started

### Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.13+ | Backend development |
| Node.js | 20+ | Frontend development |
| Bun | 1.3+ | Package management |
| Git | Latest | Version control |
| Docker | Latest | Local services (optional) |

### First-Time Setup

```bash
# 1. Fork the repository on GitHub

# 2. Clone your fork
git clone https://github.com/YOUR_USERNAME/Nezuko-Telegram-Bot.git
cd Nezuko-Telegram-Bot

# 3. Add upstream remote
git remote add upstream https://github.com/mohdakil2426/Nezuko-Telegram-Bot.git

# 4. Create virtual environment
python -m venv .venv
source .venv/bin/activate  # Linux/Mac
.\.venv\Scripts\activate   # Windows

# 5. Install dependencies
bun install
pip install -r requirements.txt
pip install -r apps/api/requirements.txt
pip install -r apps/bot/requirements.txt

# 6. Set up pre-commit hooks
pip install pre-commit
pre-commit install

# 7. Copy environment files
cp apps/bot/.env.example apps/bot/.env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 8. Start developing!
```

---

## Development Setup

### Running Services Locally

```bash
# Terminal 1: Bot
cd apps/bot
python main.py

# Terminal 2: API
cd apps/api
python -m uvicorn src.main:app --reload --port 8080

# Terminal 3: Web
cd apps/web
bun run dev
```

### Using Turborepo

```bash
# Run all services
npx turbo dev

# Run specific service
npx turbo dev --filter=@nezuko/web

# Build all
npx turbo build
```

### VS Code Setup

Recommended extensions:

```json
// .vscode/extensions.json
{
  "recommendations": [
    "ms-python.python",
    "charliermarsh.ruff",
    "ms-python.mypy-type-checker",
    "bradlc.vscode-tailwindcss",
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

Settings:

```json
// .vscode/settings.json
{
  "python.defaultInterpreterPath": ".venv/bin/python",
  "python.formatting.provider": "none",
  "[python]": {
    "editor.defaultFormatter": "charliermarsh.ruff",
    "editor.formatOnSave": true
  },
  "ruff.lint.args": ["--config=pyproject.toml"],
  "css.validate": false,
  "files.associations": {
    "*.css": "tailwindcss"
  }
}
```

---

## Code Style

### Python

We follow PEP 8 with some modifications:

| Rule | Setting |
|------|---------|
| Line length | 100 characters |
| Formatter | Ruff |
| Linter | Ruff + Pylint |
| Type checker | Pyrefly |

#### Commands

```bash
# Linting
ruff check .                    # Check for issues
ruff check . --fix              # Auto-fix issues
ruff format .                   # Format code

# Type checking
python -m pyrefly check         # 0 errors required

# Pylint (target: 10.00/10)
pylint apps/bot apps/api
```

#### Patterns

```python
# ✅ Good
from collections.abc import Awaitable

async def get_user(user_id: int) -> User | None:
    """
    Fetch a user by ID.
    
    Args:
        user_id: The Telegram user ID.
    
    Returns:
        The user if found, None otherwise.
    """
    return await db.execute(select(User).where(User.id == user_id))


# ❌ Bad
def get_user(user_id):  # Missing types
    return db.query(User).filter_by(id=user_id).first()  # Sync, no docs
```

### TypeScript

| Rule | Setting |
|------|---------|
| Line length | 100 characters |
| Formatter | Prettier |
| Linter | ESLint |

#### Commands

```bash
cd apps/web

# Type checking
bun run type-check

# Linting
bun run lint

# Formatting
bun run format
```

#### Patterns

```typescript
// ✅ Good
interface UserProps {
  id: string;
  name: string;
  email: string;
}

export function UserCard({ id, name, email }: UserProps) {
  return (
    <Card>
      <CardTitle>{name}</CardTitle>
      <CardDescription>{email}</CardDescription>
    </Card>
  );
}


// ❌ Bad
export function UserCard(props: any) {  // No types
  return <div>{props.name}</div>;       // No semantic HTML
}
```

### CSS (Tailwind v4)

```css
/* ✅ Good - Use @theme for design tokens */
@theme {
  --color-primary-500: oklch(0.55 0.25 265);
}

/* ❌ Bad - Hardcoded values */
.button {
  background-color: #6366f1;  /* Use Tailwind classes instead */
}
```

---

## Git Workflow

### Branch Naming

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New feature | `feature/multi-channel-support` |
| `fix/` | Bug fix | `fix/verification-timeout` |
| `refactor/` | Code refactoring | `refactor/database-layer` |
| `docs/` | Documentation | `docs/api-reference` |
| `chore/` | Maintenance | `chore/update-dependencies` |

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `style` | Formatting |
| `refactor` | Code restructuring |
| `test` | Tests |
| `chore` | Maintenance |

**Examples:**

```bash
feat(bot): add multi-channel verification support

fix(api): resolve connection pool exhaustion under load

docs(readme): update installation instructions

refactor(web): migrate to TanStack Query v5
```

### Keeping Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Merge main branch
git checkout main
git merge upstream/main

# Push to your fork
git push origin main
```

---

## Testing

### Python Tests

```bash
# Run all tests
pytest

# With coverage
pytest --cov=apps --cov-report=html

# Run specific tests
pytest tests/unit/test_verification.py -v
pytest -k "test_join" -v

# Run with verbose output
pytest -v --tb=short
```

### TypeScript Tests

```bash
cd apps/web

# Unit tests with Vitest
bun run test

# Watch mode
bun run test:watch

# Coverage
bun run test:coverage
```

### E2E Tests

```bash
# Playwright tests
cd apps/web
bun run test:e2e

# With UI
bun run test:e2e --ui
```

### Writing Tests

#### Python

```python
# tests/unit/test_verification.py

import pytest
from apps.bot.services.verification import check_membership


@pytest.fixture
def mock_bot():
    """Create a mock bot instance."""
    bot = AsyncMock()
    bot.get_chat_member.return_value = MagicMock(status="member")
    return bot


@pytest.mark.asyncio
async def test_check_membership_success(mock_bot):
    """User is a member of the channel."""
    result = await check_membership(
        bot=mock_bot,
        channel_id=-1001234567890,
        user_id=123456789
    )
    
    assert result is True
    mock_bot.get_chat_member.assert_called_once()


@pytest.mark.asyncio
async def test_check_membership_not_member(mock_bot):
    """User is not a member of the channel."""
    mock_bot.get_chat_member.return_value = MagicMock(status="left")
    
    result = await check_membership(
        bot=mock_bot,
        channel_id=-1001234567890,
        user_id=123456789
    )
    
    assert result is False
```

#### TypeScript

```typescript
// apps/web/src/lib/hooks/__tests__/use-groups.test.ts

import { renderHook, waitFor } from '@testing-library/react';
import { useGroups } from '../use-groups';
import { wrapper } from '@/test/test-utils';

describe('useGroups', () => {
  it('fetches groups successfully', async () => {
    const { result } = renderHook(() => useGroups(), { wrapper });

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.data).toHaveLength(2);
    expect(result.current.data[0].title).toBe('Test Group');
  });

  it('handles error state', async () => {
    server.use(
      http.get('/api/v1/groups', () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useGroups(), { wrapper });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

---

## Pull Request Process

### Before Opening PR

1. **Update your branch**
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run all checks**
   ```bash
   # Python
   ruff check .
   ruff format .
   python -m pyrefly check
   pytest

   # TypeScript
   cd apps/web
   bun run type-check
   bun run lint
   bun run test
   ```

3. **Update documentation** if needed

### PR Template

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

- [ ] Unit tests pass
- [ ] E2E tests pass
- [ ] Manual testing completed

## Checklist

- [ ] Code follows project style guide
- [ ] Self-reviewed the code
- [ ] Added tests for new functionality
- [ ] Updated documentation
- [ ] No breaking changes (or documented)
```

### Review Process

1. **Automated checks** must pass
2. **At least 1 approval** required
3. **Address all comments** before merge
4. **Squash and merge** to main

---

## Architecture Guidelines

### Adding a New API Endpoint

1. **Create schema** in `apps/api/src/schemas/`
2. **Add endpoint** in `apps/api/src/api/v1/endpoints/`
3. **Register router** in `apps/api/src/api/v1/router.py`
4. **Add tests** in `tests/api/`
5. **Update docs** if public API

### Adding a Bot Command

1. **Create handler** in `apps/bot/handlers/`
2. **Register handler** in `apps/bot/main.py`
3. **Add tests** in `tests/bot/`
4. **Update command docs**

### Adding a Web Page

1. **Create page** in `apps/web/src/app/`
2. **Add components** in `apps/web/src/components/`
3. **Add hooks** if needed in `apps/web/src/lib/hooks/`
4. **Add route to sidebar** if applicable
5. **Add tests**

### Database Changes

1. **Modify model** in `apps/*/database/models.py`
2. **Create migration**
   ```bash
   python -m alembic revision --autogenerate -m "description"
   ```
3. **Review migration** (auto-generate can miss things)
4. **Test on local database**
5. **Document schema change**

---

## Getting Help

- **Discord**: [Join our Discord](#)
- **Issues**: [GitHub Issues](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/issues)
- **Discussions**: [GitHub Discussions](https://github.com/mohdakil2426/Nezuko-Telegram-Bot/discussions)

---

## Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` file
- Release notes
- Monthly contributor highlight

---

*Thank you for contributing to Nezuko! ❤️*
