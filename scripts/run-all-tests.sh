#!/usr/bin/env bash
set -euo pipefail

export MONGODB_URI_TEST="mongodb://127.0.0.1:27017/splitwise_api_test"

echo "Checking MongoDB test connection..."
mongosh "${MONGODB_URI_TEST}" --quiet --eval "db.runCommand({ ping: 1 }).ok" >/dev/null

echo "Clearing Jest cache..."
pnpm --filter api exec jest --clearCache

echo "Running API unit tests..."
pnpm test:api:unit

echo "Running API integration tests..."
pnpm test:api:integration

echo "Running E2E tests..."
pnpm test:e2e

echo "All test suites passed."