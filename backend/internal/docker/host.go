package docker

import (
	"fmt"

	"docker-manager/internal/models"

	"github.com/docker/docker/api/types"
)

// GetHostInfo は Docker daemon と接続先ホストの概況を返す。
func (c *Client) GetHostInfo() (*models.HostInfo, error) {
	info, err := c.cli.Info(c.ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch docker info: %w", err)
	}

	hi := &models.HostInfo{
		DockerVersion:     info.ServerVersion,
		OperatingSystem:   info.OperatingSystem,
		Architecture:      info.Architecture,
		Kernel:            info.KernelVersion,
		TotalCPUs:         info.NCPU,
		TotalMemoryBytes:  info.MemTotal,
		ContainersRunning: info.ContainersRunning,
		ContainersStopped: info.ContainersStopped,
		ContainersPaused:  info.ContainersPaused,
		Images:            info.Images,
	}

	// DiskUsage はやや重い API なので失敗しても致命傷にしない。
	if du, err := c.cli.DiskUsage(c.ctx, types.DiskUsageOptions{}); err == nil {
		hi.DiskUsageBytes = du.LayersSize
	}
	return hi, nil
}
