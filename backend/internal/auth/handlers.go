package auth

import (
	"errors"
	"net/http"
	"strings"

	"docker-manager/internal/store"

	"github.com/gin-gonic/gin"
)

// Handler は auth 系 API ハンドラを保持する。
type Handler struct {
	store *store.Store
	mgr   *Manager
}

// NewHandler は Handler を構築する。
func NewHandler(s *store.Store, mgr *Manager) *Handler {
	return &Handler{store: s, mgr: mgr}
}

// RegisterRoutes は auth と setup の HTTP ルートを登録する。
func (h *Handler) RegisterRoutes(r *gin.Engine) {
	r.GET("/api/setup/status", h.SetupStatus)
	r.POST("/api/setup", h.Setup)

	r.POST("/api/auth/login", h.Login)
	r.POST("/api/auth/logout", h.Logout)
	r.GET("/api/auth/me", h.mgr.RequireUser(), h.Me)
}

// ---------------------- requests / responses ----------------------

type credentialsRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type userResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	CreatedAt int64  `json:"createdAt"`
}

func toUserResponse(u *store.User) userResponse {
	return userResponse{
		ID:        u.ID,
		Username:  u.Username,
		CreatedAt: u.CreatedAt.Unix(),
	}
}

// ---------------------- handlers ----------------------

// SetupStatus は GET /api/setup/status。ユーザーが 0 人のときのみ初期セットアップが必要。
func (h *Handler) SetupStatus(c *gin.Context) {
	n, err := h.store.Users.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"needsSetup": n == 0})
}

// Setup は POST /api/setup。ユーザーが 0 人のときだけ受け付ける（初期 admin 作成）。
func (h *Handler) Setup(c *gin.Context) {
	var req credentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid json body"})
		return
	}
	username := strings.TrimSpace(req.Username)
	if username == "" || req.Password == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "username and password are required"})
		return
	}
	if len(req.Password) < 8 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "password must be at least 8 characters"})
		return
	}

	n, err := h.store.Users.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	if n > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "setup_already_done", "message": "setup has already been completed"})
		return
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	user, err := h.store.Users.Create(username, hash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	if err := h.mgr.Issue(c, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(user)})
}

// Login は POST /api/auth/login。
func (h *Handler) Login(c *gin.Context) {
	var req credentialsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid json body"})
		return
	}
	user, hash, err := h.store.Users.GetByUsername(strings.TrimSpace(req.Username))
	if err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_credentials", "message": "invalid username or password"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	if err := VerifyPassword(hash, req.Password); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid_credentials", "message": "invalid username or password"})
		return
	}
	if err := h.mgr.Issue(c, user); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(user)})
}

// Logout は POST /api/auth/logout。
func (h *Handler) Logout(c *gin.Context) {
	h.mgr.Revoke(c)
	c.Status(http.StatusNoContent)
}

// Me は GET /api/auth/me。RequireUser ミドルウェア経由で呼ばれる。
func (h *Handler) Me(c *gin.Context) {
	user := CurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(user)})
}
