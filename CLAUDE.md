# StackDesk

サーバ上の Docker Compose アプリを Web UI と MCP 経由で管理するツール。

## 構成

```
backend/   Go 1.25 + Gin + modernc.org/sqlite + go-sdk MCP
frontend/  React 19 + TypeScript + Vite + Tailwind CSS + TanStack Query + react-i18next
```

- 認証: bcrypt password + session cookie + per-user MCP token
- DB: SQLite (`/data/stackdesk.db`)
- Docker socket をマウントしてホスト Docker を操作

## 開発ワークフロー

### ホットリロード環境（推奨）

```bash
./dev.sh
```

- backend: Air で `.go` 変更を検知して再起動
- frontend: Vite HMR
- 起動後 frontend `http://localhost:5173` / backend `http://localhost:8080`
- DEVELOPMENT.md に詳細

### マニュアル起動

```bash
# 本番ライクなビルド
docker compose up --build

# Backend 単体
cd backend && air

# Frontend 単体
cd frontend && npm run dev
```

## テスト・lint・ビルド

```bash
# Backend（全パッケージのテスト、race 検出付き）
cd backend && go test -race ./... && go vet ./...

# Frontend lint（ESLint）
cd frontend && npm run lint

# Frontend build（tsc -b + vite build）
cd frontend && npm run build
```

CI: `.github/workflows/ci.yml` で main push / PR ごとに上記を実行。

## コーディング規約

- Go: 標準 `gofmt`、`go vet` クリーン必須
- TS/React:
  - ESLint flat config（`eslint.config.js`）、`tseslint.configs.recommended` + react-hooks + react-refresh
  - shadcn/ui パターンで component と CVA 関数を同一ファイル export する場合は `// eslint-disable-next-line react-refresh/only-export-components` を使う
- i18n: 全 UI 文字列は `react-i18next` 経由、`src/i18n/locales/{en,ja}/*.json` に追加
- 言語: コードコメントは英語、ユーザ向け文字列は en/ja 両方

## Docker サブシステム

`backend/internal/docker/` がホスト Docker を操作する中核。

- `compose.go` — `docker compose` プロジェクト一覧（Go map の iteration randomization 対策で `sort.Slice` 必須）
- `inspect.go` — `isSecretEnvKey()` で env var をマスク（`token` / `secret` / `password` / `key` を含む key は値を redact）
- `logs.go` — multiplexed Docker log stream の demux

## MCP サーバ

`backend/internal/mcp/` で 9 tools を expose（apps 一覧 / start / stop / restart / logs / inspect / images 等）。bearer token 認証、token は UI から user ごとに発行。

## OSS プロジェクトとして

- public OSS リポ（GitHub `archfill/stackdesk`）
- 個人デプロイ設定は **このリポには置かない**（別の private ops リポで管理）
- 機密情報・内部 IP・hostname は commit しない方針
