# ============================================================
# GMBot v2.0 - Production Dockerfile
# ============================================================
# Multi-stage build for smaller image size
# Usage:
#   docker build -t gmbot:latest .
#   docker run --env-file .env gmbot:latest
# ============================================================

# Stage 1: Builder
FROM python:3.13-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# ============================================================
# Stage 2: Production
# ============================================================
FROM python:3.13-slim as production

# Labels
LABEL maintainer="GMBot Team"
LABEL version="2.0"
LABEL description="Multi-tenant Telegram Group Manager Bot"

# Environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PATH="/opt/venv/bin:$PATH" \
    # Default to production
    ENVIRONMENT=production

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && addgroup --system --gid 1001 gmbot \
    && adduser --system --uid 1001 --gid 1001 gmbot

WORKDIR /app

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv

# Copy application code
COPY --chown=gmbot:gmbot bot/ ./bot/
COPY --chown=gmbot:gmbot alembic.ini ./
COPY --chown=gmbot:gmbot requirements.txt ./

# Create directories for data
RUN mkdir -p /app/data /app/logs && \
    chown -R gmbot:gmbot /app

# Switch to non-root user
USER gmbot

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose ports
# 8000: Health check / Metrics
# 8443: Webhook (if using webhook mode)
EXPOSE 8000 8443

# Default command
CMD ["python", "-m", "bot.main"]
