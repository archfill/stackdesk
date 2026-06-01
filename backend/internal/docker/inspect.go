package docker

import (
	"fmt"
	"sort"
	"strings"

	"docker-manager/internal/models"
)

// InspectApp は指定プロジェクトの services を inspect して詳細を集約する。
func (c *Client) InspectApp(projectName string) (*models.InspectedApp, error) {
	containers, err := c.getProjectContainers(projectName, "")
	if err != nil {
		return nil, err
	}
	if len(containers) == 0 {
		return nil, fmt.Errorf("no containers found for project %q", projectName)
	}

	app := &models.InspectedApp{
		Name:     projectName,
		Status:   "stopped",
		Services: make([]models.ServiceDetail, 0, len(containers)),
		Labels:   map[string]string{},
	}

	for _, cont := range containers {
		inspected, err := c.cli.ContainerInspect(c.ctx, cont.ID)
		if err != nil {
			return nil, fmt.Errorf("failed to inspect container %s: %w", cont.ID, err)
		}

		detail := models.ServiceDetail{
			Name:         cont.Labels["com.docker.compose.service"],
			ContainerID:  cont.ID,
			Image:        cont.Image,
			Status:       cont.State,
			State:        cont.Status,
			Created:      inspected.Created,
			RestartCount: inspected.RestartCount,
		}
		if inspected.State != nil {
			detail.StartedAt = inspected.State.StartedAt
		}
		if inspected.Config != nil {
			detail.ImageDigest = strings.TrimSpace(inspected.Image)
			detail.Env = parseEnv(inspected.Config.Env)
		}
		if inspected.NetworkSettings != nil {
			for name := range inspected.NetworkSettings.Networks {
				detail.Networks = append(detail.Networks, name)
			}
			sort.Strings(detail.Networks)
			for port, bindings := range inspected.NetworkSettings.Ports {
				for _, b := range bindings {
					detail.Ports = append(detail.Ports, fmt.Sprintf("%s:%s->%s", b.HostIP, b.HostPort, port))
				}
			}
			sort.Strings(detail.Ports)
		}
		for _, m := range inspected.Mounts {
			detail.Mounts = append(detail.Mounts, fmt.Sprintf("%s:%s", m.Source, m.Destination))
		}
		sort.Strings(detail.Mounts)

		// プロジェクト全体のラベルを最初のコンテナから拾う（com.docker.compose.* はサービス固有のため除外）。
		if len(app.Labels) == 0 {
			for k, v := range cont.Labels {
				if strings.HasPrefix(k, "com.docker.compose.") {
					continue
				}
				app.Labels[k] = v
			}
		}

		if cont.State == "running" {
			app.Status = "running"
		} else if strings.Contains(cont.Status, "Restarting") || strings.Contains(cont.Status, "unhealthy") {
			if app.Status != "running" {
				app.Status = "error"
			}
		}

		app.Services = append(app.Services, detail)
	}

	sort.Slice(app.Services, func(i, j int) bool {
		return app.Services[i].Name < app.Services[j].Name
	})
	return app, nil
}

// parseEnv は ["K=V"] 形式の env スライスを map に変換する。
func parseEnv(env []string) map[string]string {
	out := make(map[string]string, len(env))
	for _, kv := range env {
		i := strings.IndexByte(kv, '=')
		if i < 0 {
			out[kv] = ""
			continue
		}
		out[kv[:i]] = kv[i+1:]
	}
	return out
}
