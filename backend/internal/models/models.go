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
