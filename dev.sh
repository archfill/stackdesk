#!/bin/bash

# Docker Compose Manager - 開発環境起動スクリプト

set -e

echo "🚀 Docker Compose Manager - 開発環境"
echo "======================================"
echo ""

# Docker のチェック
if ! command -v docker &> /dev/null; then
    echo "❌ Docker がインストールされていません"
    exit 1
fi

# Docker Compose のチェック（新旧両対応）
DOCKER_COMPOSE_CMD=""
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
    echo "✅ Docker Compose (plugin) が利用可能です"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker-compose"
    echo "✅ Docker Compose (standalone) が利用可能です"
else
    echo "❌ Docker Compose がインストールされていません"
    echo ""
    echo "以下のいずれかをインストールしてください："
    echo "  - Docker Desktop（Docker Compose plugin 同梱）"
    echo "  - docker-compose (standalone): https://docs.docker.com/compose/install/"
    exit 1
fi

echo ""

# 既存のコンテナを停止
echo "🛑 既存のコンテナを停止中..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down 2>/dev/null || true
echo ""

# ビルドして起動
echo "🔨 コンテナをビルド中..."
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml build
echo ""

echo "🚀 開発環境を起動中..."
echo ""
echo "======================================"
echo "📝 起動後にアクセスできるURL:"
echo "   フロントエンド: http://localhost:5173"
echo "   バックエンド:   http://localhost:8080"
echo "   ヘルスチェック: http://localhost:8080/health"
echo ""
echo "🔥 ホットリロード有効:"
echo "   - バックエンド (Go): Air による自動リロード"
echo "   - フロントエンド (React): Vite HMR"
echo ""
echo "⌨️  ログを表示するには:"
echo "   $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 停止するには:"
echo "   Ctrl+C または $DOCKER_COMPOSE_CMD -f docker-compose.dev.yml down"
echo "======================================"
echo ""

# 起動
$DOCKER_COMPOSE_CMD -f docker-compose.dev.yml up
