# Contributing to Nezuko - The Ultimate All-In-One Bot

Thank you for considering contributing to Nezuko! This document provides guidelines and steps for contributing.

## 📋 Code of Conduct

Please be respectful and constructive in all interactions. We're building something together!

## 🚀 Getting Started

### Prerequisites
- Python 3.13+
- Git
- Docker (optional, for integration tests)

### Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Nezuko-Telegram-Bot.git
   cd Nezuko-Telegram-Bot
   ```

3. **Set up virtual environment**:
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\activate
   
   # Linux/Mac
   source venv/bin/activate
   ```

4. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   pip install ruff mypy pytest pytest-asyncio pytest-cov
   ```

5. **Create your branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 📝 Development Workflow

### Code Style

We use **Ruff** for linting and formatting:

```bash
# Check linting
ruff check bot/

# Auto-fix issues
ruff check bot/ --fix

# Check formatting
ruff format --check bot/

# Auto-format
ruff format bot/
```

### Type Hints

All new code should include type hints. Run MyPy to check:

```bash
mypy bot/
```

### Testing

Write tests for new features and bug fixes:

```bash
# Run all tests
pytest tests/ -v

# Run with coverage
pytest tests/ -v --cov=bot --cov-report=html

# Run specific test file
pytest tests/test_handlers.py -v
```

## 🔧 Making Changes

### Commit Messages

Use clear, descriptive commit messages:

- `feat: Add batch verification for large groups`
- `fix: Resolve Unicode encoding on Windows console`
- `docs: Update README with Docker instructions`
- `refactor: Simplify cache key generation`
- `test: Add edge case tests for verification`

### Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Run the full test suite** locally
4. **Push your branch** and create a PR
5. **Fill out the PR template** completely
6. **Request review** from maintainers

## 🏗️ Architecture Guidelines

### Project Structure

```
bot/
├── config.py           # Environment configuration
├── main.py             # Entry point
├── core/               # Core utilities (database, cache, rate limiting)
├── database/           # ORM models and CRUD operations
├── handlers/           # Telegram command and event handlers
├── services/           # Business logic
└── utils/              # Utilities (logging, metrics, health checks)
```

### Key Principles

1. **Async-first**: Use `async/await` for all I/O operations
2. **Graceful degradation**: Cache and optional services should fail gracefully
3. **Multi-tenancy**: All operations must be scoped to specific groups/channels
4. **Observability**: Add metrics and logging for new features

### Database Changes

When modifying the database schema:

1. Create a new Alembic migration:
   ```bash
   alembic revision --autogenerate -m "Description of change"
   ```

2. Review the generated migration file

3. Test both upgrade and downgrade:
   ```bash
   alembic upgrade head
   alembic downgrade -1
   alembic upgrade head
   ```

## 🐛 Reporting Bugs

Use the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md) and include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Python version, etc.)
- Relevant logs

## 💡 Feature Requests

Use the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md) and include:

- Problem statement
- Proposed solution
- Use cases

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 🙏 Thank You!

Your contributions make Nezuko better for everyone. We appreciate your time and effort!
