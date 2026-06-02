---
name: stackdesk-local
description: Work with the local StackDesk development environment. Use when the user asks to run this repo locally, start or stop the dev server, check local execution settings, troubleshoot local ports or hot reload, inspect Docker Compose startup logs, or rebuild the StackDesk dev stack.
---

# StackDesk Local

## Purpose

Use the existing project files as the source of truth:

- `just dev` is the preferred local startup entrypoint.
- `docker-compose.dev.yml` defines the development stack.
- `DEVELOPMENT.md` and `README.md` contain the documented commands and URLs.

Do not invent separate local startup commands unless the repo files have changed.

## Startup Workflow

1. Confirm the working directory is the repository root:

   ```bash
   pwd
   ```

2. Check for local changes before running or editing anything:

   ```bash
   git status --short
   ```

3. Start the development environment with:

   ```bash
   just dev
   ```

   This script detects `docker compose` or `docker-compose`, stops any existing dev stack, rebuilds images, and starts the services.

4. If invoking Docker Compose directly, use:

   ```bash
   docker compose -f docker-compose.dev.yml up --build
   ```

   Fall back to `docker-compose -f docker-compose.dev.yml up --build` only when the Docker Compose plugin is unavailable.

## Local URLs

After startup, report these endpoints:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8080`
- Health check: `http://localhost:8080/health`

## Logs And Stop Commands

Use these commands for common follow-up operations:

```bash
docker compose -f docker-compose.dev.yml logs -f
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml down -v
```

## Configuration Notes

- Backend dev service uses `PORT=8080` and `GIN_MODE=debug`.
- Frontend dev service uses `NODE_ENV=development` and `VITE_API_URL=http://backend:8080` inside Docker.
- `frontend/.env.example` exists for local frontend configuration outside Docker and points `VITE_API_URL` to `http://localhost:8080`.
- The backend mounts `/var/run/docker.sock` so it can inspect and control the host Docker engine.
- Go hot reload is handled by Air with `backend/.air.toml`.
- React hot reload is handled by Vite on port `5173`.

## Troubleshooting

When startup fails, inspect in this order:

1. Docker availability:

   ```bash
   docker version
   docker compose version
   ```

2. Port conflicts:

   ```bash
   lsof -i :8080
   lsof -i :5173
   ```

3. Service logs:

   ```bash
   docker compose -f docker-compose.dev.yml logs backend
   docker compose -f docker-compose.dev.yml logs frontend
   ```

If a command fails because Docker is unavailable, a port is occupied, or sandbox permissions block Docker access, report the exact failure and the next concrete command to run.
