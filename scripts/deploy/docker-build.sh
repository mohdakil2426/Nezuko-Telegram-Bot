#!/bin/bash
# Build all Docker services from config/docker directory
# Usage: ./scripts/deploy/docker-build.sh

cd "$(dirname "$0")/../../config/docker" || exit 1
docker-compose build
