# StackDesk

<p align="center">
  <img src="./frontend/public/favicon.svg" alt="StackDesk icon" width="96" height="96">
</p>

StackDesk は、サーバ上の Docker Compose アプリケーションと単体コンテナを Web UI と MCP 経由で管理する Compose-first な運用コンソールです。

## 技術スタック

### バックエンド

- **Go 1.25**
- **Gin** — HTTP フレームワーク
- **Docker SDK for Go** — Docker API クライアント
- **modernc.org/sqlite** — ユーザー / セッション / MCP トークンの永続化（pure-Go SQLite）
- **bcrypt** — パスワードハッシュ
- **modelcontextprotocol/go-sdk v1.6.1** — MCP サーバ実装

### フロントエンド

- **Node.js 24**
- **React 19** + TypeScript
- **Vite** — 開発サーバ / ビルド
- **TanStack Query** — サーバ状態
- **Tailwind CSS** — スタイリング
- **Material Symbols** — アイコン

## 主要機能

- ✅ Docker Compose プロジェクト一覧（ステータスフィルタ・名前検索）
- ✅ コンテナの起動・停止・再起動・ログ閲覧
- ✅ イメージ更新チェック（manifest digest 比較）/ pull
- ✅ Web UI のログイン認証（cookie セッション）
- ✅ admin / member の 2 階層ロール
- ✅ UI から MCP トークンの発行・失効
- ✅ MCP サーバ (Streamable HTTP) — Claude などからリモート操作可能

## セットアップ

### 前提条件

- Docker
- Docker Compose (`docker compose` または `docker-compose`)

### 開発環境

```bash
./dev.sh                 # docker compose を自動検出して起動
# 別タブで:
open http://localhost:5173
```

**初回アクセス**:

1. UI に「初期セットアップ」画面が出るので最初の admin ユーザーを作成
2. ログイン後、左メニューの「MCP Tokens」から MCP 用トークンを発行
3. 必要に応じて「Users」から追加ユーザーを作成

**ホットリロード**:

- バックエンド: Air が `.go` 変更を検知し再起動
- フロントエンド: Vite HMR

詳細は [DEVELOPMENT.md](./DEVELOPMENT.md) を参照。

### 本番環境

```bash
# 必要な環境変数を設定して起動
export CORS_ALLOWED_ORIGINS="https://stackdesk.example.com"
export COOKIE_SECURE=true   # HTTPS 経由なら必須
docker compose up -d --build
```

DB ファイル (`/data/stackdesk.db`) は `stackdesk-data` ボリュームに保存される。バックアップはこのボリュームの中身をコピーすればよい。

### 環境変数

| 変数                   | 既定値                                                      | 用途                                                                                       |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `PORT`                 | `8080`                                                      | バックエンド listen ポート                                                                 |
| `DB_PATH`              | `./data/stackdesk.db` (dev), `/data/stackdesk.db` | SQLite ファイルパス                                                                        |
| `CORS_ALLOWED_ORIGINS` | dev: `http://localhost:5173,http://localhost:3000`          | カンマ区切りで許可する Origin                                                              |
| `COOKIE_SECURE`        | `false`                                                     | `true` でセッション cookie を Secure 属性付きで発行（HTTPS 必須）                          |
| `VITE_API_URL`         | `http://localhost:8080`                                     | フロントが叩く API のベース URL（ブラウザに焼き込まれるので host 側から見える URL を指定） |

## 認証 / 認可

### ログイン

- セッションは cookie ベース（`stackdesk_session`, HttpOnly, SameSite=Lax）
- DB には `sha256(session_id)` のみ保存
- 既定 TTL: 7 日

### ロール

| 操作                                         | admin | member |
| -------------------------------------------- | :---: | :----: |
| ログイン / コンテナ操作 / 自分のトークン管理 |  ✅   |   ✅   |
| 他ユーザーの一覧・作成・削除                 |  ✅   |   ❌   |
| 他ユーザーのロール変更                       |  ✅   |   ❌   |

初期セットアップで作成された最初のユーザーは自動的に admin。最終 admin の自己降格・削除はサーバ側でガードされる。

## API エンドポイント

### 認証

| Method | Path                | 認証               | 用途                        |
| ------ | ------------------- | ------------------ | --------------------------- |
| `GET`  | `/api/setup/status` | 不要               | `{needsSetup: bool}`        |
| `POST` | `/api/setup`        | 不要（users=0 時） | 初期 admin 作成（以後 409） |
| `POST` | `/api/auth/login`   | 不要               | ログイン / cookie 発行      |
| `POST` | `/api/auth/logout`  | 不要               | session 失効                |
| `GET`  | `/api/auth/me`      | session            | 現在のユーザー情報          |

### コンテナ管理（session 必須）

- `GET /api/apps` — Compose プロジェクト一覧
- `POST /api/apps/:name/{start,stop,restart}` — ライフサイクル操作
- `GET /api/apps/:name/logs` — ログ取得
- `GET /api/apps/:name/images/updates` / `POST /api/apps/:name/images/pull` — イメージ操作

### MCP トークン管理（session 必須・自分のものだけ）

- `GET /api/tokens` — 自分のトークン一覧（plaintext は含まない）
- `POST /api/tokens` — 新規発行。**レスポンスにのみ平文を含む（1 度だけ表示）**
- `DELETE /api/tokens/:id` — 失効（soft delete）

### ユーザー管理（admin 専用）

- `GET /api/users` — 一覧
- `POST /api/users` — 作成（body: `{username, password, role}`）
- `PATCH /api/users/:id/role` — ロール変更
- `DELETE /api/users/:id` — 削除（自己削除・最終 admin 削除は 409）

### その他

- `GET /health` — 無認証ヘルスチェック

## MCP サーバ

`/mcp` で公式 SDK ベースの Streamable HTTP MCP サーバを公開。

### 認証

- UI で発行した MCP トークン (`sdt_...`) を `Authorization: Bearer <token>` で送信
- トークンは DB に `sha256(plaintext)` で保存、UI には先頭 12 文字のプレフィックスのみ表示
- 失効済みトークンは即座に拒否される

### 公開ツール（9 種）

| ツール                                   | 説明                                                                        |
| ---------------------------------------- | --------------------------------------------------------------------------- |
| `list_apps`                              | Compose プロジェクト一覧（`status_filter`, `name_filter`）                  |
| `inspect_app`                            | image digest, env (secret はマスク), ports, networks, mounts, restart count |
| `get_logs`                               | プロジェクト or 単一 service のログ（`tail`, `since`, 最大 2000 行）        |
| `get_host_info`                          | Docker daemon と host の概況                                                |
| `start_app` / `stop_app` / `restart_app` | ライフサイクル（service 単位の指定可）                                      |
| `pull_images`                            | 全 service イメージ pull                                                    |
| `check_image_updates`                    | local digest と registry manifest を比較                                    |

### 接続例（Claude Code）

リポジトリルートに `.mcp.json`（gitignore 済み）を置く:

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

Claude Code を再起動して MCP server を承認すると `mcp__stackdesk__*` ツールが利用できる。

## 開発

### バックエンド

```bash
cd backend
go test ./...          # 全テスト
go run cmd/server/main.go
```

### フロントエンド

```bash
cd frontend
npm install
npm run dev
npm run build
```

## プロジェクト構造

```
stackdesk/
├── backend/
│   ├── cmd/server/main.go            # エントリーポイント
│   ├── internal/
│   │   ├── api/                      # REST API ハンドラ
│   │   ├── auth/                     # 認証 (bcrypt, session, middleware)
│   │   ├── docker/                   # Docker API クライアントラッパー
│   │   ├── mcp/                      # MCP サーバ + 9 tool
│   │   ├── models/                   # 共通モデル
│   │   └── store/                    # SQLite (users / sessions / mcp_tokens)
│   ├── Dockerfile                    # 本番
│   ├── Dockerfile.dev                # 開発 (Air)
│   └── go.mod
│
├── frontend/
│   ├── src/
│   │   ├── api/client.ts             # 統一 fetch client
│   │   ├── components/               # AuthGate, Login/Setup, TokenManager, UserManager 等
│   │   ├── hooks/                    # useAuth, useTokens, useUsers
│   │   └── App.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml                # 本番
├── docker-compose.dev.yml            # 開発
└── README.md
```

## ライセンス

MIT
