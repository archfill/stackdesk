# Contributing to StackDesk

Thanks for considering a contribution. This document keeps the loop short:
spin up the dev environment, run the checks, send a focused PR.

## Runtime requirements

Both languages declare their required toolchain in source so any version
manager — or none — works:

- **Node**: minimum version is pinned by `engines.node` in
  `frontend/package.json` (currently `>=26.0.0`).
- **Go**: minimum version and toolchain are pinned by the `go` /
  `toolchain` directives in `backend/go.mod`.

Use whatever manager you prefer (`mise`, `asdf`, `proto`, `volta`, `nvm`,
plain installer, …). CI consumes the same files via
`setup-node`'s `node-version-file` and `setup-go`'s `go-version-file` so
local and CI stay in sync without a second source of truth.

## Development setup

The fastest way is the hot-reload Docker environment:

```bash
./dev.sh
```

This runs `docker-compose.dev.yml` with Air (Go) and Vite HMR. See
[`DEVELOPMENT.md`](DEVELOPMENT.md) for the full tour, and [`CLAUDE.md`](CLAUDE.md)
for the architecture cheatsheet.

After bootstrap:

- Frontend: <http://localhost:5173>
- Backend: <http://localhost:8080>

## Checks before opening a PR

```bash
# Backend
cd backend
go vet ./...
go test -race ./...

# Frontend
cd frontend
npm ci
npm run lint
npm run build
```

CI runs the same checks on every push and pull request.

## Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) so the
history stays scannable and changelog tooling can hook in later:

- `feat: ...` user-facing functionality
- `fix: ...` bug fix
- `refactor: ...` non-behavioural restructuring
- `chore: ...` build, deps, tooling
- `docs: ...`, `test: ...`, `ci: ...` for the obvious categories

Scope is optional but encouraged when the change is localised: `feat(mcp): ...`,
`fix(frontend): ...`.

## Pull requests

- Keep PRs focused — one logical change per PR is easier to review.
- Update or add tests for any behaviour change.
- Update docs (`README.md`, `DEVELOPMENT.md`, `CLAUDE.md`) when you change
  developer-facing behaviour.
- Don't include personal infra details (hostnames, IPs, secrets, deploy URLs)
  in the OSS repo; keep those in your own ops repo.

## Reporting bugs and security issues

- Bugs: open an issue with the "Bug report" template.
- Security: see [`SECURITY.md`](SECURITY.md) — please do **not** open a public
  issue for vulnerabilities.

## Code of conduct

Be kind, be specific, assume good faith. We don't have a separate document for
now; if a situation calls for one, raise it in an issue.
