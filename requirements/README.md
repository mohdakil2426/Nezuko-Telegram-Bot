# Requirements Directory

This directory contains the modular Python dependency structure for the Nezuko project.

## Structure

```
requirements/
├── base.txt       ← Shared dependencies (SQLAlchemy, Redis, Pydantic, etc.)
├── api.txt        ← API-specific (FastAPI, Uvicorn, Slowapi)
├── bot.txt        ← Bot-specific (python-telegram-bot)
├── dev.txt        ← Development tools (pytest, ruff, mypy)
├── prod-api.txt   ← Production API (base + api)
└── prod-bot.txt   ← Production Bot (base + bot)
```

## Usage

### Development (Full Setup)

Install everything for local development:

```bash
pip install -r requirements.txt
```

### Production Deployment

**API Container:**
```bash
pip install --no-cache-dir -r requirements/prod-api.txt
```

**Bot Container:**
```bash
pip install --no-cache-dir -r requirements/prod-bot.txt
```

### CI/CD Pipeline

```bash
pip install -r requirements.txt  # Full deps for testing
pytest --cov                     # Run tests with coverage
ruff check .                     # Lint code
mypy apps/                       # Type check
```

## Docker Examples

### Dockerfile.api
```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/prod-api.txt
COPY apps/api/src/ src/
EXPOSE 8080
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8080"]
```

### Dockerfile.bot
```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements/ requirements/
RUN pip install --no-cache-dir -r requirements/prod-bot.txt
COPY apps/bot/ .
CMD ["python", "main.py"]
```

## Benefits

- **DRY**: Shared dependencies defined once in `base.txt`
- **Minimal Production Images**: Only required packages installed
- **Clear Separation**: Dev tools never in production
- **Easy Updates**: Change version in one place
- **Backward Compatible**: App-level requirements still work
