package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/archfill/stackdesk/internal/auth"
	"github.com/archfill/stackdesk/internal/store"

	"github.com/gin-gonic/gin"
)

// TokensHandler は MCP トークン管理 API を提供する。
type TokensHandler struct {
	store *store.Store
}

// NewTokensHandler は TokensHandler を構築する。
func NewTokensHandler(s *store.Store) *TokensHandler {
	return &TokensHandler{store: s}
}

// RegisterTokenRoutes は /api/tokens 配下のルートをグループに登録する。
// 呼び出し側で auth middleware を適用済みの group を渡す前提。
func (h *TokensHandler) RegisterTokenRoutes(g *gin.RouterGroup) {
	g.GET("/tokens", h.List)
	g.POST("/tokens", h.Create)
	g.DELETE("/tokens/:id", h.Revoke)
}

// tokenResponse は API クライアントに返すトークン表現。token 平文は含まない。
type tokenResponse struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Prefix     string `json:"prefix"`
	CreatedAt  int64  `json:"createdAt"`
	LastUsedAt *int64 `json:"lastUsedAt,omitempty"`
	RevokedAt  *int64 `json:"revokedAt,omitempty"`
}

func toTokenResponse(t *store.MCPToken) tokenResponse {
	tr := tokenResponse{
		ID:        t.ID,
		Name:      t.Name,
		Prefix:    t.Prefix,
		CreatedAt: t.CreatedAt.Unix(),
	}
	if t.LastUsedAt != nil {
		v := t.LastUsedAt.Unix()
		tr.LastUsedAt = &v
	}
	if t.RevokedAt != nil {
		v := t.RevokedAt.Unix()
		tr.RevokedAt = &v
	}
	return tr
}

// List は GET /api/tokens。
func (h *TokensHandler) List(c *gin.Context) {
	user := auth.CurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	tokens, err := h.store.MCPTokens.ListByUser(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	out := make([]tokenResponse, 0, len(tokens))
	for _, t := range tokens {
		out = append(out, toTokenResponse(t))
	}
	c.JSON(http.StatusOK, gin.H{"tokens": out})
}

// Create は POST /api/tokens。平文トークンを 1 回だけレスポンスで返す。
func (h *TokensHandler) Create(c *gin.Context) {
	user := auth.CurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	var req struct {
		Name string `json:"name"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid json body"})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "name is required"})
		return
	}
	plaintext, token, err := h.store.MCPTokens.Create(user.ID, name)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"token":     toTokenResponse(token),
		"plaintext": plaintext, // この一度きりしか取得できない旨を UI で明示する
	})
}

// Revoke は DELETE /api/tokens/:id。
func (h *TokensHandler) Revoke(c *gin.Context) {
	user := auth.CurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid token id"})
		return
	}
	if err := h.store.MCPTokens.Revoke(user.ID, id); err != nil {
		if errors.Is(err, store.ErrTokenNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "token not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
