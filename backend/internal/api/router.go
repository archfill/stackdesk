package api

import (
	"docker-manager/internal/docker"

	"github.com/gin-gonic/gin"
)

// RegisterRoutes は API ルートを登録
func RegisterRoutes(r *gin.Engine, dockerClient *docker.Client) {
	handler := NewHandler(dockerClient)

	// ヘルスチェック
	r.GET("/health", handler.HealthCheck)

	// API グループ
	api := r.Group("/api")
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
	}
}
