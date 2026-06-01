package docker

import (
	"fmt"
	"sort"
	"strings"

	"github.com/archfill/stackdesk/internal/models"

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

	// マップからスライスに変換。
	// Go の map iteration は意図的に順序が不定なので、決定的順序を保証するため
	// プロジェクト名・サービス名で安定ソートする（UI が 5 秒ごとの polling で
	// 並びがちらつくのを防ぐ）。
	apps := make([]models.ComposeApp, 0, len(projectMap))
	for _, app := range projectMap {
		sort.Slice(app.Services, func(i, j int) bool {
			return app.Services[i].Name < app.Services[j].Name
		})
		apps = append(apps, *app)
	}
	sort.Slice(apps, func(i, j int) bool {
		return apps[i].Name < apps[j].Name
	})

	return apps, nil
}

// StartComposeApp は Docker Compose アプリケーションを起動。service が空文字なら全サービス対象。
func (c *Client) StartComposeApp(projectName, service string) error {
	containers, err := c.getProjectContainers(projectName, service)
	if err != nil {
		return err
	}
	if len(containers) == 0 {
		return fmt.Errorf("no containers found for project %q service %q", projectName, service)
	}

	for _, cont := range containers {
		if err := c.cli.ContainerStart(c.ctx, cont.ID, container.StartOptions{}); err != nil {
			return fmt.Errorf("failed to start container %s: %w", cont.ID, err)
		}
	}

	return nil
}

// StopComposeApp は Docker Compose アプリケーションを停止。service が空文字なら全サービス対象。
func (c *Client) StopComposeApp(projectName, service string) error {
	containers, err := c.getProjectContainers(projectName, service)
	if err != nil {
		return err
	}
	if len(containers) == 0 {
		return fmt.Errorf("no containers found for project %q service %q", projectName, service)
	}

	for _, cont := range containers {
		timeout := 10
		if err := c.cli.ContainerStop(c.ctx, cont.ID, container.StopOptions{Timeout: &timeout}); err != nil {
			return fmt.Errorf("failed to stop container %s: %w", cont.ID, err)
		}
	}

	return nil
}

// RestartComposeApp は Docker Compose アプリケーションを再起動。service が空文字なら全サービス対象。
func (c *Client) RestartComposeApp(projectName, service string) error {
	containers, err := c.getProjectContainers(projectName, service)
	if err != nil {
		return err
	}
	if len(containers) == 0 {
		return fmt.Errorf("no containers found for project %q service %q", projectName, service)
	}

	for _, cont := range containers {
		timeout := 10
		if err := c.cli.ContainerRestart(c.ctx, cont.ID, container.StopOptions{Timeout: &timeout}); err != nil {
			return fmt.Errorf("failed to restart container %s: %w", cont.ID, err)
		}
	}

	return nil
}

// getProjectContainers は指定されたプロジェクト（および任意で service）のコンテナ一覧を取得。
func (c *Client) getProjectContainers(projectName, service string) ([]types.Container, error) {
	filterArgs := filters.NewArgs()
	filterArgs.Add("label", fmt.Sprintf("com.docker.compose.project=%s", projectName))
	if service != "" {
		filterArgs.Add("label", fmt.Sprintf("com.docker.compose.service=%s", service))
	}

	containers, err := c.cli.ContainerList(c.ctx, container.ListOptions{
		All:     true,
		Filters: filterArgs,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	return containers, nil
}
