package mcp

import (
	"docker-manager/internal/docker"

	mcpsdk "github.com/modelcontextprotocol/go-sdk/mcp"
)

// registerTools は MCP server に tool を登録する。
// 実体の tool 定義は別 PR で順次追加。スカフォールド段階では何も登録しない。
func registerTools(_ *mcpsdk.Server, _ *docker.Client) {
}
