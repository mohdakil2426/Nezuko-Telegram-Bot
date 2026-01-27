# ============================================
# NEZUKO ADMIN API - PRODUCTION DOCKERFILE
# ============================================

# Stage 1: Builder
FROM python:3.13-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
COPY apps/api/requirements.txt apps/api/requirements.txt

# Install root reqs (for shared src code) and api reqs
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
RUN pip install --no-cache-dir --prefix=/install -r apps/api/requirements.txt

# Stage 2: Runtime
FROM python:3.13-slim

WORKDIR /app

# Install runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 nezuko

# Copy installed packages
COPY --from=builder /install /usr/local

# Copy Application Code
# We rely on running 'docker build -f apps/api/Dockerfile .' from the project root
COPY src /app/src
COPY apps/api/src /app/apps/api/src
# Create certs directory (should be mounted as secret in prod, but structure needed)
RUN mkdir -p /app/apps/api/certs && chown nezuko:nezuko /app/apps/api/certs

# Set Python Path
ENV PYTHONPATH=/app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Switch to non-root user
USER nezuko

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run Application
CMD ["uvicorn", "apps.api.src.main:app", "--host", "0.0.0.0", "--port", "8080", "--proxy-headers"]
