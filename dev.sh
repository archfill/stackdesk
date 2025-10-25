#!/bin/bash

# Docker Compose Manager - 開発環境起動スクリプト

set -e

echo "🚀 Docker Compose Manager - 開発環境"
echo "======================================"
echo ""

# Docker と Docker Compose のチェック
if ! command -v docker &> /dev/null; then
    echo "❌ Docker がインストールされていません"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose がインストールされていません"
    exit 1
fi

echo "✅ Docker がインストールされています"
echo ""

# 既存のコンテナを停止
echo "🛑 既存のコンテナを停止中..."
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
echo ""

# ビルドして起動
echo "🔨 コンテナをビルド中..."
docker-compose -f docker-compose.dev.yml build
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
echo "   docker-compose -f docker-compose.dev.yml logs -f"
echo ""
echo "🛑 停止するには:"
echo "   Ctrl+C または docker-compose -f docker-compose.dev.yml down"
echo "======================================"
echo ""

# 起動
docker-compose -f docker-compose.dev.yml up
