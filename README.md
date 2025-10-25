# Docker Compose Manager

Docker Compose アプリケーションを管理するための Web インターフェース

## 技術スタック

### バックエンド
- **Go 1.25** (最新安定版)
- **Gin** - HTTPフレームワーク
- **Docker SDK for Go** - Docker API クライアント

### フロントエンド
- **Node.js 24** (最新LTS)
- **React 18**
- **TypeScript**
- **Vite** - ビルドツール（SWC）
- **Tailwind CSS** - CSSフレームワーク
- **Material Symbols** - アイコン

## 主要機能

- ✅ Docker Compose アプリケーション一覧表示
- ✅ コンテナの起動・停止・再起動
- ✅ リアルタイムログ表示
- ✅ イメージ更新チェック
- ✅ docker compose pull 実行

## セットアップ

### 前提条件
- Docker
- Docker Compose (`docker compose` または `docker-compose`)

### 開発環境の起動（推奨）

**🔥 フルホットリロード対応！**

**推奨**: 自動検出スクリプトを使用
```bash
# docker compose / docker-compose を自動検出して起動
./dev.sh
```

**または手動で起動**:
```bash
# Docker Compose plugin (新しい方式)
docker compose -f docker-compose.dev.yml up --build

# または docker-compose standalone (古い方式)
docker-compose -f docker-compose.dev.yml up --build
```

**アクセス URL:**
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:8080

**ホットリロード機能:**
- ✅ **バックエンド (Go)**: Air による自動リロード - `.go` ファイル変更を検知して自動再起動
- ✅ **フロントエンド (React)**: Vite HMR - TypeScript/React の変更を即座に反映（ブラウザリフレッシュ不要）

コードを編集して保存するだけで、自動的に変更が反映されます！

**詳細は [DEVELOPMENT.md](./DEVELOPMENT.md) を参照してください。**

### 本番環境の起動

```bash
# 本番環境を起動
docker compose up -d --build
# または: docker-compose up -d --build

# アクセス
# バックエンド: http://localhost:8080
# フロントエンド: http://localhost:3000
```

## API エンドポイント

### アプリケーション管理
- `GET /api/apps` - アプリケーション一覧取得
- `POST /api/apps/:name/start` - アプリケーション起動
- `POST /api/apps/:name/stop` - アプリケーション停止
- `POST /api/apps/:name/restart` - アプリケーション再起動

### ログ
- `GET /api/apps/:name/logs` - ログ取得

### イメージ管理
- `GET /api/apps/:name/images/updates` - イメージ更新確認
- `POST /api/apps/:name/images/pull` - イメージプル

### ヘルスチェック
- `GET /health` - ヘルスチェック

## 開発

### バックエンド

```bash
cd backend

# 依存関係のインストール
go mod download

# 開発サーバー起動（要Go 1.21+）
go run cmd/server/main.go
```

### フロントエンド

```bash
cd frontend

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## プロジェクト構造

```
docker-manager/
├── backend/                      # Go バックエンド
│   ├── cmd/
│   │   └── server/
│   │       └── main.go          # エントリーポイント
│   ├── internal/
│   │   ├── api/                 # HTTPハンドラー・ルーター
│   │   ├── docker/              # Docker API クライアント
│   │   └── models/              # データモデル
│   ├── Dockerfile               # 本番用
│   ├── Dockerfile.dev           # 開発用
│   └── go.mod
│
├── frontend/                     # React + Vite
│   ├── src/
│   │   ├── components/          # UI コンポーネント
│   │   ├── api/                 # API クライアント
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml            # 本番環境用
├── docker-compose.dev.yml        # 開発環境用
└── README.md
```

## ライセンス

MIT
