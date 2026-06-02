# StackDesk task runner. Run `just` to list available recipes.

set shell := ["bash", "-cu"]

# Default recipe: print the recipe list
default:
    @just --list --unsorted

# --- Onboarding -----------------------------------------------------------

# Install dependencies for both backend and frontend
install:
    cd backend && go mod download
    cd frontend && pnpm install --frozen-lockfile

# --- Development ----------------------------------------------------------

# Start the hot-reload dev stack (backend with Air, frontend with Vite HMR)
dev:
    docker compose -f docker-compose.dev.yml up --build

# Tear down the dev stack
dev-down:
    docker compose -f docker-compose.dev.yml down

# Tail the dev compose logs
logs:
    docker compose -f docker-compose.dev.yml logs -f

# Open a shell inside the dev backend container
shell-backend:
    docker compose -f docker-compose.dev.yml exec backend sh

# Run the backend locally with Air (requires Go and Air installed)
backend-dev:
    cd backend && air

# Run the frontend locally with Vite (requires Node and pnpm)
frontend-dev:
    cd frontend && pnpm install && pnpm run dev

# --- Quality gates --------------------------------------------------------

# Run everything CI runs
check: vet fmt-check tidy-check test-backend lint-frontend build-frontend

alias ci := check

# Backend: go vet
vet:
    cd backend && go vet ./...

# Backend: race-detector test suite
test-backend:
    cd backend && go test -race ./...

# Frontend: ESLint
lint-frontend:
    cd frontend && pnpm install --frozen-lockfile && pnpm run lint

# Frontend: production build (tsc + vite)
build-frontend:
    cd frontend && pnpm install --frozen-lockfile && pnpm run build

# --- Formatting & module hygiene ------------------------------------------

# Format Go sources with gofmt
fmt:
    cd backend && gofmt -w .

# Fail if any Go source is not gofmt-clean
fmt-check:
    @cd backend && diff=$(gofmt -l .); \
      if [ -n "$diff" ]; then \
        echo "gofmt would change the following files:"; \
        echo "$diff"; \
        exit 1; \
      fi

# Normalize backend/go.mod and backend/go.sum
mod-tidy:
    cd backend && go mod tidy

# Fail if go mod tidy would modify backend/go.mod or backend/go.sum
tidy-check:
    @cd backend && go mod tidy && \
      git diff --exit-code go.mod go.sum

# --- Production -----------------------------------------------------------

# Build the production compose stack
build:
    docker compose build

# Run the production compose stack
up:
    docker compose up -d

# Stop the production compose stack
down:
    docker compose down

# --- Cleanup --------------------------------------------------------------

# Clean build artifacts and caches
clean:
    rm -rf frontend/dist frontend/node_modules backend/tmp backend/server
