package models

import "time"

// ComposeApp は Docker Compose アプリケーションを表す
type ComposeApp struct {
	Name         string    `json:"name"`
	Services     []Service `json:"services"`
	Status       string    `json:"status"` // running, stopped, error
	LastDeployed time.Time `json:"lastDeployed,omitempty"`
}

// Service は Docker Compose サービス（コンテナ）を表す
type Service struct {
	Name        string `json:"name"`
	ContainerID string `json:"containerId"`
	Image       string `json:"image"`
	Status      string `json:"status"` // running, exited, など
	State       string `json:"state"`  // 詳細なステート情報
}

// ImageUpdate はイメージ更新情報を表す
type ImageUpdate struct {
	ServiceName    string `json:"serviceName"`
	CurrentImage   string `json:"currentImage"`
	CurrentDigest  string `json:"currentDigest"`
	LatestDigest   string `json:"latestDigest"`
	UpdateRequired bool   `json:"updateRequired"`
}

// LogEntry はログエントリを表す
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Service   string    `json:"service"`
	Message   string    `json:"message"`
	Stream    string    `json:"stream"` // stdout or stderr
}

// ErrorResponse はエラーレスポンスを表す
type ErrorResponse struct {
	Error   string `json:"error"`
	Message string `json:"message"`
}

// InspectedApp は inspect_app tool が返す詳細情報。
type InspectedApp struct {
	Name     string            `json:"name"`
	Status   string            `json:"status"`
	Services []ServiceDetail   `json:"services"`
	Labels   map[string]string `json:"labels,omitempty"`
}

// ServiceDetail は単一サービスの inspect 情報。
type ServiceDetail struct {
	Name         string            `json:"name"`
	ContainerID  string            `json:"containerId"`
	Image        string            `json:"image"`
	ImageDigest  string            `json:"imageDigest,omitempty"`
	Status       string            `json:"status"`
	State        string            `json:"state"`
	Created      string            `json:"created,omitempty"`
	StartedAt    string            `json:"startedAt,omitempty"`
	RestartCount int               `json:"restartCount"`
	Ports        []string          `json:"ports,omitempty"`
	Networks     []string          `json:"networks,omitempty"`
	Mounts       []string          `json:"mounts,omitempty"`
	Env          map[string]string `json:"env,omitempty"`
}

// LogLine は get_logs tool が返す 1 行のログエントリ。
type LogLine struct {
	Service string `json:"service"`
	Stream  string `json:"stream"`
	Message string `json:"message"`
}

// HostInfo は get_host_info tool が返すホストとデーモンの概況。
type HostInfo struct {
	DockerVersion     string `json:"dockerVersion"`
	APIVersion        string `json:"apiVersion,omitempty"`
	OperatingSystem   string `json:"operatingSystem"`
	Architecture      string `json:"architecture"`
	Kernel            string `json:"kernel"`
	TotalCPUs         int    `json:"totalCPUs"`
	TotalMemoryBytes  int64  `json:"totalMemoryBytes"`
	ContainersRunning int    `json:"containersRunning"`
	ContainersStopped int    `json:"containersStopped"`
	ContainersPaused  int    `json:"containersPaused"`
	Images            int    `json:"images"`
	DiskUsageBytes    int64  `json:"diskUsageBytes,omitempty"`
}
