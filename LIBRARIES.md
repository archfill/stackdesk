# 導入ライブラリガイド

このドキュメントでは、プロジェクトに導入された主要ライブラリとその使用方法について説明します。

## 📋 目次

- [バックエンド (Go)](#バックエンド-go)
  - [Viper - 設定管理](#viper---設定管理)
  - [Zerolog - 構造化ロギング](#zerolog---構造化ロギング)
  - [GORM - ORM](#gorm---orm)
  - [Testify - テスティング](#testify---テスティング)
- [フロントエンド (React/TypeScript)](#フロントエンド-reacttypescript)
  - [TanStack Query - データフェッチング](#tanstack-query---データフェッチング)
  - [Zustand - 状態管理](#zustand---状態管理)
  - [React Router - ルーティング](#react-router---ルーティング)
  - [shadcn/ui - UIコンポーネント](#shadcnui---uiコンポーネント)

---

## バックエンド (Go)

### Viper - 設定管理

**パッケージ:** `github.com/spf13/viper`

#### 概要
環境変数、設定ファイル、コマンドラインフラグを一元管理するライブラリです。

#### 使用方法

設定は `internal/config/config.go` で定義されています。

```go
package main

import (
    "docker-manager/internal/config"
    "log"
)

func main() {
    // 設定の読み込み
    cfg, err := config.Load()
    if err != nil {
        log.Fatal(err)
    }

    // 設定値の使用
    port := cfg.Server.Port
    logLevel := cfg.Log.Level
}
```

#### 環境変数

環境変数は `APP_` プレフィックスを使用します：

```bash
# サーバーポート
export APP_SERVER_PORT=8080

# ログレベル (debug, info, warn, error)
export APP_LOG_LEVEL=info

# ログフォーマット (json, console)
export APP_LOG_FORMAT=json

# データベース設定
export APP_DATABASE_DRIVER=sqlite
export APP_DATABASE_DSN=docker-manager.db
```

#### 設定ファイル (オプション)

`config.yaml` または `./config/config.yaml` を作成することもできます：

```yaml
server:
  port: "8080"
  allowedOrigins:
    - "http://localhost:5173"
    - "http://localhost:3000"

log:
  level: "info"
  format: "json"

database:
  driver: "sqlite"
  dsn: "docker-manager.db"
```

---

### Zerolog - 構造化ロギング

**パッケージ:** `github.com/rs/zerolog`

#### 概要
ゼロアロケーションのJSON構造化ロギングライブラリ。高性能でメモリ効率が良いです。

#### 使用方法

```go
package main

import (
    "github.com/rs/zerolog/log"
)

func main() {
    // シンプルなログ
    log.Info().Msg("Application starting")

    // フィールド付きログ
    log.Info().
        Str("service", "api").
        Int("port", 8080).
        Msg("Server started")

    // エラーログ
    err := someFunction()
    if err != nil {
        log.Error().
            Err(err).
            Str("operation", "database").
            Msg("Operation failed")
    }

    // デバッグログ
    log.Debug().
        Interface("data", someData).
        Msg("Processing data")
}
```

#### ログレベル
- `Debug` - 詳細なデバッグ情報
- `Info` - 一般的な情報
- `Warn` - 警告
- `Error` - エラー
- `Fatal` - 致命的エラー（アプリ終了）
- `Panic` - パニック（アプリクラッシュ）

---

### GORM - ORM

**パッケージ:** `gorm.io/gorm`

#### 概要
Go用の開発者フレンドリーなORM。データベース操作を簡単にします。

#### 使用方法

```go
package main

import (
    "docker-manager/internal/database"
)

// モデル定義
type User struct {
    ID        uint   `gorm:"primarykey"`
    Name      string `gorm:"size:100;not null"`
    Email     string `gorm:"size:100;unique;not null"`
    CreatedAt time.Time
    UpdatedAt time.Time
}

func main() {
    // データベース接続はmain.goで自動的に初期化されます

    // マイグレーション
    database.AutoMigrate(&User{})

    // 作成
    user := User{Name: "John", Email: "john@example.com"}
    database.DB.Create(&user)

    // 検索
    var users []User
    database.DB.Find(&users)

    // 条件付き検索
    var user User
    database.DB.Where("email = ?", "john@example.com").First(&user)

    // 更新
    database.DB.Model(&user).Update("Name", "John Doe")

    // 削除
    database.DB.Delete(&user)
}
```

---

### Testify - テスティング

**パッケージ:** `github.com/stretchr/testify`

#### 概要
Go用のアサーションとモック機能を提供するテスティングフレームワーク。

#### 使用方法

```go
package mypackage

import (
    "testing"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestSomething(t *testing.T) {
    // アサーション (失敗してもテスト継続)
    result := someFunction()
    assert.Equal(t, expected, result)
    assert.NotNil(t, result)
    assert.True(t, result > 0)

    // Require (失敗したらテスト中止)
    config, err := loadConfig()
    require.NoError(t, err)
    require.NotNil(t, config)
}

func TestWithSubtests(t *testing.T) {
    t.Run("正常系", func(t *testing.T) {
        result := someFunction(validInput)
        assert.NoError(t, result)
    })

    t.Run("異常系", func(t *testing.T) {
        result := someFunction(invalidInput)
        assert.Error(t, result)
    })
}
```

#### テスト実行

```bash
# 全テスト実行
go test ./...

# カバレッジ付き
go test -cover ./...

# 詳細表示
go test -v ./...

# 特定のパッケージ
go test ./internal/config
```

---

## フロントエンド (React/TypeScript)

### TanStack Query - データフェッチング

**パッケージ:** `@tanstack/react-query`

#### 概要
サーバーデータの取得、キャッシング、同期、更新を管理するライブラリ。

#### 使用方法

カスタムフックは `src/hooks/useApps.ts` に定義されています。

```typescript
import { useApps, useStartApp, useStopApp } from '@/hooks/useApps'

function AppList() {
  // データ取得 (自動キャッシング、5秒ごとに更新)
  const { data: apps, isLoading, error } = useApps()

  // Mutation (データ変更)
  const startApp = useStartApp()
  const stopApp = useStopApp()

  const handleStart = (name: string) => {
    startApp.mutate(name, {
      onSuccess: () => {
        console.log('App started!')
      },
      onError: (error) => {
        console.error('Failed to start app:', error)
      }
    })
  }

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div>
      {apps?.map(app => (
        <div key={app.name}>
          {app.name}
          <button onClick={() => handleStart(app.name)}>
            Start
          </button>
        </div>
      ))}
    </div>
  )
}
```

#### 利用可能なフック

- `useApps()` - アプリ一覧取得（自動更新）
- `useStartApp()` - アプリ起動
- `useStopApp()` - アプリ停止
- `useRestartApp()` - アプリ再起動
- `useLogs(name)` - ログ取得（自動更新）
- `useCheckUpdates(name)` - イメージ更新確認
- `usePullImages()` - イメージプル

---

### Zustand - 状態管理

**パッケージ:** `zustand`

#### 概要
シンプルで軽量な状態管理ライブラリ。Reduxより簡単に使えます。

#### 使用方法

ストアは `src/stores/` に定義されています。

```typescript
// ストアの使用
import { useViewStore } from '@/stores/useViewStore'

function MyComponent() {
  // 状態とアクションを取得
  const { activeView, setActiveView } = useViewStore()

  return (
    <div>
      <p>Active View: {activeView}</p>
      <button onClick={() => setActiveView('apps')}>
        Switch View
      </button>
    </div>
  )
}
```

#### 新しいストアの作成

```typescript
// src/stores/useUserStore.ts
import { create } from 'zustand'

interface UserStore {
  user: User | null
  setUser: (user: User) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
}))
```

---

### React Router - ルーティング

**パッケージ:** `react-router-dom`

#### 概要
React用の宣言的なルーティングライブラリ。SPA（Single Page Application）のページ遷移を管理します。

#### 使用方法

```typescript
import { Routes, Route, Link, useNavigate } from 'react-router-dom'

function App() {
  return (
    <div>
      <nav>
        <Link to="/">Home</Link>
        <Link to="/apps">Apps</Link>
        <Link to="/settings">Settings</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apps" element={<AppList />} />
        <Route path="/apps/:name" element={<AppDetail />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </div>
  )
}

// パラメータの取得
function AppDetail() {
  const { name } = useParams()
  return <div>App: {name}</div>
}

// プログラマティックナビゲーション
function MyComponent() {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate('/apps')
  }

  return <button onClick={handleClick}>Go to Apps</button>
}
```

---

### shadcn/ui - UIコンポーネント

**パッケージ:** Radix UI + Tailwind CSS ベース

#### 概要
コンポーネントをプロジェクトに直接コピーする方式のUIライブラリ。高いカスタマイズ性を持ちます。

#### 使用方法

基本的なButtonコンポーネントは `src/components/ui/button.tsx` に用意されています。

```typescript
import { Button } from '@/components/ui/button'

function MyComponent() {
  return (
    <div>
      {/* デフォルト */}
      <Button>Click me</Button>

      {/* バリアント */}
      <Button variant="destructive">Delete</Button>
      <Button variant="outline">Cancel</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>

      {/* サイズ */}
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <Button size="icon">
        <Icon />
      </Button>

      {/* 無効化 */}
      <Button disabled>Disabled</Button>
    </div>
  )
}
```

#### ユーティリティ関数

`src/lib/utils.ts` の `cn()` 関数を使ってクラスをマージできます：

```typescript
import { cn } from '@/lib/utils'

function MyComponent({ className }: { className?: string }) {
  return (
    <div className={cn('base-class', 'text-lg', className)}>
      Content
    </div>
  )
}
```

---

## 次のステップ

### 開発環境の起動

```bash
# 依存関係のインストールとビルド
docker compose -f docker-compose.dev.yml up --build
```

### テストの実行

```bash
# バックエンド
docker compose -f docker-compose.dev.yml exec backend go test ./...

# フロントエンド
docker compose -f docker-compose.dev.yml exec frontend npm run lint
```

### ドキュメント参照

- [Viper](https://github.com/spf13/viper)
- [Zerolog](https://github.com/rs/zerolog)
- [GORM](https://gorm.io/)
- [Testify](https://github.com/stretchr/testify)
- [TanStack Query](https://tanstack.com/query/latest)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Router](https://reactrouter.com/)
- [shadcn/ui](https://ui.shadcn.com/)
