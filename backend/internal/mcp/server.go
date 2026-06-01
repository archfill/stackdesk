// Package mcp は docker-manager の MCP サーバを公開する。
package mcp

import (
	"context"
	"crypto/subtle"
	"net/http"
	"time"

	"docker-manager/internal/docker"

	"github.com/modelcontextprotocol/go-sdk/auth"
	mcpsdk "github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	implementationName    = "docker-manager"
	implementationVersion = "0.1.0"
	requiredScope         = "docker"
)

// New は MCP server を組み立てて http.Handler を返す。
// token は静的 Bearer トークン。空文字は許容しない（fail-closed）。
func New(dockerClient *docker.Client, token string) http.Handler {
	server := mcpsdk.NewServer(&mcpsdk.Implementation{
		Name:    implementationName,
		Version: implementationVersion,
	}, nil)

	registerTools(server, dockerClient)

	handler := mcpsdk.NewStreamableHTTPHandler(func(*http.Request) *mcpsdk.Server {
		return server
	}, nil)

	verifier := staticTokenVerifier(token)
	middleware := auth.RequireBearerToken(verifier, &auth.RequireBearerTokenOptions{
		Scopes: []string{requiredScope},
	})

	return middleware(handler)
}

// staticTokenVerifier は定数時間比較で固定トークンを検証する TokenVerifier を返す。
func staticTokenVerifier(expected string) auth.TokenVerifier {
	expectedBytes := []byte(expected)
	return func(_ context.Context, presented string, _ *http.Request) (*auth.TokenInfo, error) {
		if subtle.ConstantTimeCompare([]byte(presented), expectedBytes) != 1 {
			return nil, auth.ErrInvalidToken
		}
		return &auth.TokenInfo{
			Scopes:     []string{requiredScope},
			Expiration: time.Now().Add(24 * time.Hour),
		}, nil
	}
}
