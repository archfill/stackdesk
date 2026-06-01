package api

import (
	"docker-manager/internal/docker"
	"docker-manager/internal/store"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes は API ルートを登録する。
// authMW は /api/* （setup/auth 以外）に適用される session 認証。
// adminMW は admin 専用ルート（/api/users 系）に追加適用される認可ミドルウェア。
// /health は常に無認証。
func RegisterRoutes(
	r *gin.Engine,
	dockerClient *docker.Client,
	st *store.Store,
	authMW gin.HandlerFunc,
	adminMW gin.HandlerFunc,
) {
	handler := NewHandler(dockerClient)
	tokensHandler := NewTokensHandler(st)
	usersHandler := NewUsersHandler(st)

	// ヘルスチェック（無認証）
	r.GET("/health", handler.HealthCheck)

	// API グループ（認証必須）
	api := r.Group("/api", authMW)
	{
		// アプリケーション一覧
		api.GET("/apps", handler.ListApps)

		// アプリケーション操作
		api.POST("/apps/:name/start", handler.StartApp)
		api.POST("/apps/:name/stop", handler.StopApp)
		api.POST("/apps/:name/restart", handler.RestartApp)

		// ログ取得
		api.GET("/apps/:name/logs", handler.GetLogs)

		// イメージ更新チェック
		api.GET("/apps/:name/images/updates", handler.CheckUpdates)
		api.POST("/apps/:name/images/pull", handler.PullImages)

		// MCP トークン管理
		tokensHandler.RegisterTokenRoutes(api)
	}

	// admin 専用ルート（session 認証 + admin 認可）
	adminAPI := r.Group("/api", authMW, adminMW)
	{
		usersHandler.RegisterUserRoutes(adminAPI)
	}
}
