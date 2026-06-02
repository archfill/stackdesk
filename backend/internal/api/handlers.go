package api

import (
	"bufio"
	"net/http"

	"github.com/archfill/stackdesk/internal/docker"
	"github.com/archfill/stackdesk/internal/models"
	"github.com/archfill/stackdesk/internal/version"

	"github.com/docker/docker/api/types/container"
	"github.com/gin-gonic/gin"
)

// Handler は API ハンドラーを保持
type Handler struct {
	dockerClient *docker.Client
}

// NewHandler は新しい Handler を作成
func NewHandler(dockerClient *docker.Client) *Handler {
	return &Handler{
		dockerClient: dockerClient,
	}
}

// ListApps は Docker Compose アプリケーション一覧を返す
func (h *Handler) ListApps(c *gin.Context) {
	apps, err := h.dockerClient.ListComposeApps()
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_list_apps",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, apps)
}

// StartApp はアプリケーションを起動
func (h *Handler) StartApp(c *gin.Context) {
	appName := c.Param("name")

	if err := h.dockerClient.StartComposeApp(appName, ""); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_start_app",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application started successfully"})
}

// StopApp はアプリケーションを停止
func (h *Handler) StopApp(c *gin.Context) {
	appName := c.Param("name")

	if err := h.dockerClient.StopComposeApp(appName, ""); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_stop_app",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application stopped successfully"})
}

// RestartApp はアプリケーションを再起動
func (h *Handler) RestartApp(c *gin.Context) {
	appName := c.Param("name")

	if err := h.dockerClient.RestartComposeApp(appName, ""); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_restart_app",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Application restarted successfully"})
}

// GetLogs はアプリケーションのログを取得
func (h *Handler) GetLogs(c *gin.Context) {
	appName := c.Param("name")

	containers, err := h.dockerClient.GetClient().ContainerList(
		h.dockerClient.GetContext(),
		container.ListOptions{All: true},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_get_logs",
			Message: err.Error(),
		})
		return
	}

	// 指定されたプロジェクトのコンテナを探す
	var targetContainer string
	for _, cont := range containers {
		if cont.Labels["com.docker.compose.project"] == appName {
			targetContainer = cont.ID
			break
		}
	}

	if targetContainer == "" {
		c.JSON(http.StatusNotFound, models.ErrorResponse{
			Error:   "container_not_found",
			Message: "No containers found for the specified application",
		})
		return
	}

	// ログを取得
	logOptions := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       "100",
	}

	logs, err := h.dockerClient.GetClient().ContainerLogs(
		h.dockerClient.GetContext(),
		targetContainer,
		logOptions,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_get_logs",
			Message: err.Error(),
		})
		return
	}
	defer logs.Close()

	// ログを読み取り
	scanner := bufio.NewScanner(logs)
	var logLines []string
	for scanner.Scan() {
		logLines = append(logLines, scanner.Text())
	}

	c.JSON(http.StatusOK, gin.H{"logs": logLines})
}

// CheckUpdates はイメージの更新をチェック
func (h *Handler) CheckUpdates(c *gin.Context) {
	appName := c.Param("name")

	updates, err := h.dockerClient.CheckImageUpdates(appName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_check_updates",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, updates)
}

// PullImages はイメージをpull
func (h *Handler) PullImages(c *gin.Context) {
	appName := c.Param("name")

	if err := h.dockerClient.PullImages(appName); err != nil {
		c.JSON(http.StatusInternalServerError, models.ErrorResponse{
			Error:   "failed_to_pull_images",
			Message: err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Images pulled successfully"})
}

// HealthCheck はヘルスチェック用エンドポイント
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "ok",
		"service": "stackdesk-api",
	})
}

// Version は frontend / 監視ツール向けに app version を返す。
func (h *Handler) Version(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"version": version.Current,
	})
}
