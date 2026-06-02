# 開発ガイド

## 🔥 ホットリロード開発環境

このプロジェクトは、Docker環境でフル機能のホットリロード開発が可能です。

### 特徴

#### バックエンド (Go)
- ✅ **Air** による自動リロード
- ✅ `.go` ファイルの変更を検知して自動ビルド・再起動
- ✅ ビルドエラーがログに表示される
- ✅ Go modules キャッシュで高速ビルド

#### フロントエンド (React + Vite)
- ✅ **Vite HMR** (Hot Module Replacement)
- ✅ TypeScript/React ファイルの変更を即座に反映
- ✅ ブラウザリフレッシュ不要
- ✅ 高速なビルドとリロード

## 🚀 クイックスタート

### 1. 開発環境の起動

**推奨**: 自動検出スクリプトを使用
```bash
# プロジェクトルートで実行（docker compose / docker-compose 自動検出）
just dev
```

**または手動で起動**:
```bash
# Docker Compose plugin (新しい方式)
docker compose -f docker-compose.dev.yml up --build

# または docker-compose standalone (古い方式)
docker-compose -f docker-compose.dev.yml up --build
```

> **Note**: このプロジェクトは `docker compose` (plugin) と `docker-compose` (standalone) の両方に対応しています。

初回起動時は依存関係のインストールとビルドに数分かかります。

### 2. アクセス

起動完了後、以下のURLにアクセス：

- **フロントエンド**: http://localhost:5173
- **バックエンドAPI**: http://localhost:8080
- **ヘルスチェック**: http://localhost:8080/health

### 3. 開発開始

コードを編集すると自動的にリロードされます：

#### バックエンド
```bash
# 例: backend/internal/api/handlers.go を編集
# → Air が変更を検知して自動的に再ビルド・再起動
```

#### フロントエンド
```bash
# 例: frontend/src/components/AppCard.tsx を編集
# → Vite が変更を検知してブラウザに即座に反映（リフレッシュ不要）
```

## 📝 ログの確認

> 以下のコマンド例では `docker compose` を使用していますが、`docker-compose` でも同じように動作します。

### 全体のログを表示
```bash
docker compose -f docker-compose.dev.yml logs -f
```

### バックエンドのみ
```bash
docker compose -f docker-compose.dev.yml logs -f backend
```

### フロントエンドのみ
```bash
docker compose -f docker-compose.dev.yml logs -f frontend
```

## 🛠 よくあるコマンド

### 環境の停止
```bash
docker compose -f docker-compose.dev.yml down
```

### 完全にクリーンアップ（ボリューム含む）
```bash
docker compose -f docker-compose.dev.yml down -v
```

### 再ビルド
```bash
docker compose -f docker-compose.dev.yml up --build
```

### コンテナ内でコマンド実行

#### バックエンドコンテナ
```bash
# Go のコマンドを実行
docker compose -f docker-compose.dev.yml exec backend go version

# 依存関係の追加
docker compose -f docker-compose.dev.yml exec backend go get github.com/example/package

# テスト実行
docker compose -f docker-compose.dev.yml exec backend go test ./...
```

#### フロントエンドコンテナ
```bash
# パッケージを追加
docker compose -f docker-compose.dev.yml exec frontend pnpm add axios

# TypeScript の型チェック
docker compose -f docker-compose.dev.yml exec frontend pnpm run type-check

# ビルド
docker compose -f docker-compose.dev.yml exec frontend pnpm run build
```

## 🐛 デバッグ

### バックエンドのデバッグ

Air のログでビルドエラーや実行時エラーを確認できます：

```bash
docker compose -f docker-compose.dev.yml logs -f backend
```

出力例：
```
backend-dev  | watching .
backend-dev  | building...
backend-dev  | running...
backend-dev  | [GIN-debug] Listening and serving HTTP on :8080
```

### フロントエンドのデバッグ

Vite の開発サーバーログを確認：

```bash
docker compose -f docker-compose.dev.yml logs -f frontend
```

ブラウザの開発者ツール（F12）でもエラーを確認できます。

### コンテナに入る

```bash
# バックエンドコンテナ
docker exec -it stackdesk-backend-dev sh

# フロントエンドコンテナ
docker exec -it stackdesk-frontend-dev sh
```

## 📂 ディレクトリ構造とマウント

### バックエンド
- `./backend` → `/app` にマウント
- Go のソースコード変更が即座に反映
- Go modules は Docker ボリュームでキャッシュ

### フロントエンド
- `./frontend` → `/app` にマウント
- React/TypeScript の変更が即座に反映
- `node_modules` は Docker ボリュームで管理（ホストと競合しない）

## ⚡️ パフォーマンス最適化

### Go modules キャッシュ
```bash
# キャッシュをクリア
docker volume rm stackdesk_go-modules
```

### Node modules キャッシュ
```bash
# キャッシュをクリア
docker volume rm stackdesk_node-modules
```

## 🔍 トラブルシューティング

### ポートが既に使用されている
```bash
# 8080 または 5173 ポートを使用しているプロセスを確認
lsof -i :8080
lsof -i :5173

# プロセスを停止するか、docker-compose.dev.yml のポート番号を変更
```

### ホットリロードが効かない
```bash
# コンテナを再起動
docker compose -f docker-compose.dev.yml restart

# 完全に再ビルド
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.dev.yml up --build
```

### 依存関係の問題
```bash
# バックエンド
docker compose -f docker-compose.dev.yml exec backend go mod tidy
docker compose -f docker-compose.dev.yml restart backend

# フロントエンド
docker compose -f docker-compose.dev.yml exec frontend pnpm install
docker compose -f docker-compose.dev.yml restart frontend
```

## 💡 Tips

1. **VS Code Remote Containers**: Docker コンテナ内で直接開発できます
2. **ブラウザの自動リロード**: Vite の HMR により、ほとんどの変更はリフレッシュ不要
3. **並行開発**: バックエンドとフロントエンドを同時に開発可能
4. **Docker Socket**: バックエンドはホストの Docker を操作できます

## 📊 開発フロー

```
1. コードを編集
   ↓
2. ファイルを保存
   ↓
3. 自動でリロード・反映
   ↓
4. ブラウザで確認
   ↓
5. 繰り返し
```

バックエンドは Air、フロントエンドは Vite が自動で変更を検知してリロードします。

## 🎯 本番環境との違い

| 項目 | 開発環境 | 本番環境 |
|------|---------|---------|
| ビルド | 自動（Air/Vite） | 最適化ビルド |
| ホットリロード | ✅ 有効 | ❌ 無効 |
| ソースマウント | ✅ あり | ❌ なし |
| ポート | 8080, 5173 | 8080, 3000 |
| Docker Compose | dev.yml | yml |

---

Happy coding! 🚀
