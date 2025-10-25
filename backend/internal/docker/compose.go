package docker

import (
	"fmt"
	"strings"

	"docker-manager/internal/models"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
)

// ListComposeApps は Docker Compose アプリケーション一覧を取得
func (c *Client) ListComposeApps() ([]models.ComposeApp, error) {
	// docker compose で起動されたコンテナを取得（com.docker.compose.project ラベルでフィルタ）
	filterArgs := filters.NewArgs()
	filterArgs.Add("label", "com.docker.compose.project")

	containers, err := c.cli.ContainerList(c.ctx, container.ListOptions{
		All:     true,
		Filters: filterArgs,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	// プロジェクトごとにグループ化
	projectMap := make(map[string]*models.ComposeApp)

	for _, cont := range containers {
		projectName := cont.Labels["com.docker.compose.project"]
		serviceName := cont.Labels["com.docker.compose.service"]

		if projectName == "" {
			continue
		}

		// プロジェクトが存在しない場合は新規作成
		if _, exists := projectMap[projectName]; !exists {
			projectMap[projectName] = &models.ComposeApp{
				Name:     projectName,
				Services: []models.Service{},
				Status:   "stopped",
			}
		}

		// サービス情報を追加
		service := models.Service{
			Name:        serviceName,
			ContainerID: cont.ID,
			Image:       cont.Image,
			Status:      cont.State,
			State:       cont.Status,
		}

		projectMap[projectName].Services = append(projectMap[projectName].Services, service)

		// アプリ全体のステータスを判定
		if cont.State == "running" {
			projectMap[projectName].Status = "running"
		} else if cont.State == "exited" && projectMap[projectName].Status != "running" {
			projectMap[projectName].Status = "stopped"
		} else if strings.Contains(cont.Status, "Restarting") || strings.Contains(cont.Status, "unhealthy") {
			projectMap[projectName].Status = "error"
		}
	}

	// マップからスライスに変換
	apps := make([]models.ComposeApp, 0, len(projectMap))
	for _, app := range projectMap {
		apps = append(apps, *app)
	}

	return apps, nil
}

// StartComposeApp は Docker Compose アプリケーションを起動
func (c *Client) StartComposeApp(projectName string) error {
	containers, err := c.getProjectContainers(projectName)
	if err != nil {
		return err
	}

	for _, cont := range containers {
		if err := c.cli.ContainerStart(c.ctx, cont.ID, container.StartOptions{}); err != nil {
			return fmt.Errorf("failed to start container %s: %w", cont.ID, err)
		}
	}

	return nil
}

// StopComposeApp は Docker Compose アプリケーションを停止
func (c *Client) StopComposeApp(projectName string) error {
	containers, err := c.getProjectContainers(projectName)
	if err != nil {
		return err
	}

	for _, cont := range containers {
		timeout := 10
		if err := c.cli.ContainerStop(c.ctx, cont.ID, container.StopOptions{Timeout: &timeout}); err != nil {
			return fmt.Errorf("failed to stop container %s: %w", cont.ID, err)
		}
	}

	return nil
}

// RestartComposeApp は Docker Compose アプリケーションを再起動
func (c *Client) RestartComposeApp(projectName string) error {
	containers, err := c.getProjectContainers(projectName)
	if err != nil {
		return err
	}

	for _, cont := range containers {
		timeout := 10
		if err := c.cli.ContainerRestart(c.ctx, cont.ID, container.StopOptions{Timeout: &timeout}); err != nil {
			return fmt.Errorf("failed to restart container %s: %w", cont.ID, err)
		}
	}

	return nil
}

// getProjectContainers は指定されたプロジェクトのコンテナ一覧を取得
func (c *Client) getProjectContainers(projectName string) ([]types.Container, error) {
	filterArgs := filters.NewArgs()
	filterArgs.Add("label", fmt.Sprintf("com.docker.compose.project=%s", projectName))

	containers, err := c.cli.ContainerList(c.ctx, container.ListOptions{
		All:     true,
		Filters: filterArgs,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	return containers, nil
}
