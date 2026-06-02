# Security Policy

## Supported versions

StackDesk is pre-1.0; security fixes only target the latest commit on `main`.
Pinning to a specific tag for production is at your own risk.

## Reporting a vulnerability

Please use **GitHub's private vulnerability reporting**:

1. Go to <https://github.com/archfill/stackdesk/security/advisories>
2. Click **Report a vulnerability**
3. Describe the issue, impact, and a reproduction if possible

Do **not** open a public issue or pull request for security problems — that
discloses the defect before a fix is available.

You can expect:

- Acknowledgement within a few days
- An assessment of impact and a planned remediation timeline
- Credit in release notes (unless you ask to remain anonymous)

## Scope

In scope:

- Authentication / session handling
- Authorisation (admin / member roles)
- MCP token issuance and validation
- Docker socket exposure and command injection
- Env-var redaction and log scrubbing
- Cross-site issues (XSS, CSRF) in the Web UI

Out of scope:

- Findings against your own deployment topology (Traefik, Tailscale, etc.) —
  those belong to your infra, not StackDesk
- Denial of service via resource exhaustion on self-hosted instances
- Issues that require already-compromised host or Docker daemon
