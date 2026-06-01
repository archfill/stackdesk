package api

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"docker-manager/internal/auth"
	"docker-manager/internal/store"

	"github.com/gin-gonic/gin"
)

// UsersHandler はユーザー管理 API (admin 専用) を提供する。
type UsersHandler struct {
	store *store.Store
}

// NewUsersHandler は UsersHandler を構築する。
func NewUsersHandler(s *store.Store) *UsersHandler {
	return &UsersHandler{store: s}
}

// RegisterUserRoutes は /api/users 配下のルートを admin 専用 group に登録する。
func (h *UsersHandler) RegisterUserRoutes(g *gin.RouterGroup) {
	g.GET("/users", h.List)
	g.POST("/users", h.Create)
	g.PATCH("/users/:id/role", h.UpdateRole)
	g.DELETE("/users/:id", h.Delete)
}

type userResponse struct {
	ID        int64  `json:"id"`
	Username  string `json:"username"`
	Role      string `json:"role"`
	Language  string `json:"language"`
	CreatedAt int64  `json:"createdAt"`
	IsActive  bool   `json:"isActive"`
}

func toUserResponse(u *store.User) userResponse {
	return userResponse{
		ID:        u.ID,
		Username:  u.Username,
		Role:      string(u.Role),
		Language:  string(u.Language),
		CreatedAt: u.CreatedAt.Unix(),
		IsActive:  u.IsActive,
	}
}

// List は GET /api/users。全ユーザーを返す。
func (h *UsersHandler) List(c *gin.Context) {
	users, err := h.store.Users.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	out := make([]userResponse, 0, len(users))
	for _, u := range users {
		out = append(out, toUserResponse(u))
	}
	c.JSON(http.StatusOK, gin.H{"users": out})
}

// Create は POST /api/users。
func (h *UsersHandler) Create(c *gin.Context) {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
		Role     string `json:"role"`
	}
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
	role := store.Role(strings.TrimSpace(req.Role))
	if role == "" {
		role = store.RoleMember
	}
	if !role.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid role"})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	user, err := h.store.Users.Create(username, hash, role)
	if err != nil {
		if errors.Is(err, store.ErrUsernameTaken) {
			c.JSON(http.StatusConflict, gin.H{"error": "username_taken", "message": "username is already taken"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"user": toUserResponse(user)})
}

// UpdateRole は PATCH /api/users/:id/role。
func (h *UsersHandler) UpdateRole(c *gin.Context) {
	currentUser := auth.CurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid user id"})
		return
	}
	var req struct {
		Role string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid json body"})
		return
	}
	newRole := store.Role(strings.TrimSpace(req.Role))
	if !newRole.IsValid() {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid role"})
		return
	}

	// 自分自身を admin から降格させようとしたら、最終 admin かどうかをチェック。
	if currentUser.ID == id && newRole != store.RoleAdmin {
		admins, err := h.store.Users.CountAdmins()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
			return
		}
		if admins <= 1 {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "last_admin",
				"message": "cannot demote the last admin",
			})
			return
		}
	}

	if err := h.store.Users.UpdateRole(id, newRole); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	user, err := h.store.Users.GetByID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"user": toUserResponse(user)})
}

// Delete は DELETE /api/users/:id。
// - 自分自身は削除不可
// - 最終 admin は削除不可
func (h *UsersHandler) Delete(c *gin.Context) {
	currentUser := auth.CurrentUser(c)
	if currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "bad_request", "message": "invalid user id"})
		return
	}
	if currentUser.ID == id {
		c.JSON(http.StatusConflict, gin.H{
			"error":   "self_delete",
			"message": "cannot delete the current user",
		})
		return
	}
	target, err := h.store.Users.GetByID(id)
	if err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	if target.Role == store.RoleAdmin {
		admins, err := h.store.Users.CountAdmins()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
			return
		}
		if admins <= 1 {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "last_admin",
				"message": "cannot delete the last admin",
			})
			return
		}
	}
	if err := h.store.Users.Delete(id); err != nil {
		if errors.Is(err, store.ErrUserNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not_found", "message": "user not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "internal", "message": err.Error()})
		return
	}
	c.Status(http.StatusNoContent)
}
