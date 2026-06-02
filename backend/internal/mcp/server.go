// Package mcp は stackdesk の MCP サーバを公開する。
package mcp

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/archfill/stackdesk/internal/docker"
	"github.com/archfill/stackdesk/internal/store"

	"github.com/modelcontextprotocol/go-sdk/auth"
	mcpsdk "github.com/modelcontextprotocol/go-sdk/mcp"
)

const (
	implementationName    = "stackdesk"
	implementationVersion = "0.0.1" // x-release-please-version
	requiredScope         = "docker"
)

// New は MCP server を組み立てて http.Handler を返す。
// 認証は store.MCPTokens から動的に解決する。
func New(dockerClient *docker.Client, st *store.Store) http.Handler {
	server := mcpsdk.NewServer(&mcpsdk.Implementation{
		Name:    implementationName,
		Version: implementationVersion,
	}, nil)

	registerTools(server, dockerClient)

	handler := mcpsdk.NewStreamableHTTPHandler(func(*http.Request) *mcpsdk.Server {
		return server
	}, nil)

	middleware := auth.RequireBearerToken(storeTokenVerifier(st), &auth.RequireBearerTokenOptions{
		Scopes: []string{requiredScope},
	})

	return middleware(handler)
}

// storeTokenVerifier は store.MCPTokens から平文トークンを検証する TokenVerifier を返す。
func storeTokenVerifier(st *store.Store) auth.TokenVerifier {
	return func(_ context.Context, presented string, _ *http.Request) (*auth.TokenInfo, error) {
		userID, err := st.MCPTokens.VerifyPlaintext(presented)
		if err != nil {
			if errors.Is(err, store.ErrTokenNotFound) {
				return nil, auth.ErrInvalidToken
			}
			return nil, err
		}
		return &auth.TokenInfo{
			UserID:     strconv.FormatInt(userID, 10),
			Scopes:     []string{requiredScope},
			Expiration: time.Now().Add(1 * time.Hour),
		}, nil
	}
}
