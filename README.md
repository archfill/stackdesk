# StackDesk

[日本語](./README.ja.md) | **English**

<p align="center">
  <img src="./frontend/public/favicon.svg" alt="StackDesk icon" width="96" height="96">
</p>

<p align="center">
  <a href="https://github.com/archfill/stackdesk/actions/workflows/ci.yml"><img src="https://github.com/archfill/stackdesk/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/archfill/stackdesk/actions/workflows/codeql.yml"><img src="https://github.com/archfill/stackdesk/actions/workflows/codeql.yml/badge.svg" alt="CodeQL"></a>
  <a href="https://github.com/archfill/stackdesk/releases"><img src="https://img.shields.io/github/v/release/archfill/stackdesk?display_name=tag&sort=semver" alt="Latest release"></a>
  <a href="https://goreportcard.com/report/github.com/archfill/stackdesk"><img src="https://goreportcard.com/badge/github.com/archfill/stackdesk" alt="Go Report Card"></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License: MIT"></a>
</p>

StackDesk is a Compose-first operations console for managing Docker Compose
projects and standalone containers on a host through a Web UI and MCP.

## Stack

### Backend

- **Go 1.25**
- **Gin** — HTTP framework
- **Docker SDK for Go** — Docker API client
- **modernc.org/sqlite** — users / sessions / MCP tokens (pure-Go SQLite)
- **bcrypt** — password hashing
- **modelcontextprotocol/go-sdk v1.6.1** — MCP server

### Frontend

- **Node.js 24**
- **React 19** + TypeScript
- **Vite** — dev server / build
- **TanStack Query** — server state
- **Tailwind CSS** — styling
- **Material Symbols** — icons

## Features

- ✅ Docker Compose project list (status filter, name search)
- ✅ Start / stop / restart containers and tail logs
- ✅ Image update check (manifest digest diff) and pull
- ✅ Cookie session authentication for the Web UI
- ✅ Two-tier roles: admin and member
- ✅ Issue / revoke MCP tokens from the UI
- ✅ MCP server (Streamable HTTP) — drive StackDesk from Claude and other MCP clients

## Getting started

### Prerequisites

- Docker
- Docker Compose (`docker compose` or `docker-compose`)

### Development environment

```bash
just dev                 # start the hot-reload dev stack
# in another tab:
open http://localhost:5173
```

**First access**:

1. The UI shows the initial setup screen — create the first admin user.
2. After login, issue an MCP token from the "MCP Tokens" page in the sidebar.
3. Add more users from the "Users" page as needed.

**Hot reload**:

- Backend: Air watches `.go` files and restarts.
- Frontend: Vite HMR.

See [DEVELOPMENT.md](./DEVELOPMENT.md) for the full walkthrough.

### Production

```bash
# Set the required environment variables and start
export CORS_ALLOWED_ORIGINS="https://stackdesk.example.com"
export COOKIE_SECURE=true   # required when serving over HTTPS
docker compose up -d --build
```

The DB (`/data/stackdesk.db`) lives on the `stackdesk-data` volume. Back it up
by copying the volume contents.

### Environment variables

| Variable               | Default                                            | Purpose                                                                          |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`                 | `8080`                                             | Backend listen port                                                              |
| `DB_PATH`              | `./data/stackdesk.db` (dev), `/data/stackdesk.db`  | SQLite file path                                                                 |
| `CORS_ALLOWED_ORIGINS` | dev: `http://localhost:5173,http://localhost:3000` | Comma-separated allowed origins                                                  |
| `COOKIE_SECURE`        | `false`                                            | `true` issues the session cookie with `Secure` (requires HTTPS)                  |
| `VITE_API_URL`         | `http://localhost:8080`                            | API base URL baked into the frontend bundle (must be reachable from the browser) |

## Auth

### Login

- Cookie-based session (`stackdesk_session`, HttpOnly, SameSite=Lax)
- Only `sha256(session_id)` is stored in the DB
- Default TTL: 7 days

### Roles

| Capability                                    | admin | member |
| --------------------------------------------- | :---: | :----: |
| Log in, operate containers, manage own tokens |  ✅   |   ✅   |
| List / create / delete other users            |  ✅   |   ❌   |
| Change other users' roles                     |  ✅   |   ❌   |

The first user created via setup is automatically admin. Demoting or deleting
the last remaining admin is blocked server-side.

## API endpoints

### Auth

| Method | Path                | Auth                       | Purpose                               |
| ------ | ------------------- | -------------------------- | ------------------------------------- |
| `GET`  | `/api/setup/status` | none                       | `{needsSetup: bool}`                  |
| `POST` | `/api/setup`        | none (only when users = 0) | Create initial admin (409 afterwards) |
| `POST` | `/api/auth/login`   | none                       | Log in, issue cookie                  |
| `POST` | `/api/auth/logout`  | none                       | Invalidate session                    |
| `GET`  | `/api/auth/me`      | session                    | Current user info                     |

### Container management (session required)

- `GET /api/apps` — list Compose projects
- `POST /api/apps/:name/{start,stop,restart}` — lifecycle actions
- `GET /api/apps/:name/logs` — fetch logs
- `GET /api/apps/:name/images/updates` / `POST /api/apps/:name/images/pull` — image operations

### MCP token management (session required, own tokens only)

- `GET /api/tokens` — list your tokens (no plaintext)
- `POST /api/tokens` — issue a new token; **plaintext only appears in this response (shown once)**
- `DELETE /api/tokens/:id` — soft-delete

### User management (admin only)

- `GET /api/users` — list
- `POST /api/users` — create (body: `{username, password, role}`)
- `PATCH /api/users/:id/role` — change role
- `DELETE /api/users/:id` — delete (409 for self or last admin)

### Other

- `GET /health` — unauthenticated health check

## MCP server

A Streamable HTTP MCP server based on the official SDK is exposed at `/mcp`.

### Auth

- Send a token issued from the UI (`sdt_...`) via `Authorization: Bearer <token>`
- Tokens are stored as `sha256(plaintext)`; only the first 12 chars appear in the UI
- Revoked tokens are rejected immediately

### Exposed tools (9)

| Tool                                     | Description                                                                |
| ---------------------------------------- | -------------------------------------------------------------------------- |
| `list_apps`                              | Compose project list (`status_filter`, `name_filter`)                      |
| `inspect_app`                            | image digest, env (secrets masked), ports, networks, mounts, restart count |
| `get_logs`                               | Logs for a project or a single service (`tail`, `since`, up to 2000 lines) |
| `get_host_info`                          | Docker daemon and host overview                                            |
| `start_app` / `stop_app` / `restart_app` | Lifecycle actions (service-level scoping supported)                        |
| `pull_images`                            | Pull images for every service                                              |
| `check_image_updates`                    | Compare local digest against registry manifest                             |

### Example client config (Claude Code)

Put `.mcp.json` (gitignored) at the repo root:

```json
{
  "mcpServers": {
    "stackdesk": {
      "type": "http",
      "url": "http://localhost:8080/mcp",
      "headers": { "Authorization": "Bearer sdt_xxxxxxxx..." }
    }
  }
}
```

Restart Claude Code and approve the MCP server to expose `mcp__stackdesk__*`
tools.

## Development

Common operations are exposed through [just](https://just.systems/):

```bash
just              # list every recipe
just dev          # start the hot-reload Docker stack
just check        # run everything CI runs (vet + tests + lint + build)
just fmt          # gofmt the backend
```

Or invoke the underlying tools directly:

```bash
cd backend && go test ./...
cd frontend && pnpm install && pnpm run dev
```

## Project layout

```
stackdesk/
├── backend/
│   ├── cmd/server/main.go            # entrypoint
│   ├── internal/
│   │   ├── api/                      # REST handlers
│   │   ├── auth/                     # bcrypt, session, middleware
│   │   ├── docker/                   # Docker API wrappers
│   │   ├── mcp/                      # MCP server + 9 tools
│   │   ├── models/                   # shared models
│   │   └── store/                    # SQLite (users / sessions / mcp_tokens)
│   ├── Dockerfile                    # production
│   ├── Dockerfile.dev                # development (Air)
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts             # unified fetch client
│   │   ├── components/               # AuthGate, Login/Setup, TokenManager, UserManager, ...
│   │   ├── hooks/                    # useAuth, useTokens, useUsers
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml                # production
├── docker-compose.dev.yml            # development
└── README.md
```

## License

MIT
