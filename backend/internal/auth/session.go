package auth

import (
	"context"
	"net/http"
	"time"

	"docker-manager/internal/store"

	"github.com/gin-gonic/gin"
)

// SessionCookieName は session ID を載せる cookie 名。
const SessionCookieName = "dm_session"

// DefaultSessionTTL は session の有効期間（7 日）。
const DefaultSessionTTL = 7 * 24 * time.Hour

// userContextKey は gin.Context / context.Context に user を載せる際のキー。
type userContextKey struct{}

// Config はセッション cookie の発行ポリシー。
type Config struct {
	Secure   bool   // 本番なら true（HTTPS 必須）
	Domain   string // 通常は空（リクエスト host に従う）
	SameSite http.SameSite
}

// Manager は session 発行・検証を管理する。
type Manager struct {
	store *store.Store
	cfg   Config
}

// NewManager は Manager を構築する。
func NewManager(s *store.Store, cfg Config) *Manager {
	if cfg.SameSite == 0 {
		cfg.SameSite = http.SameSiteLaxMode
	}
	return &Manager{store: s, cfg: cfg}
}

// Issue はユーザーに新しい session を発行し、cookie をセットする。
func (m *Manager) Issue(c *gin.Context, user *store.User) error {
	id, _, err := m.store.Sessions.Create(user.ID, DefaultSessionTTL, c.Request.UserAgent())
	if err != nil {
		return err
	}
	m.setSessionCookie(c, id, int(DefaultSessionTTL.Seconds()))
	return nil
}

// Revoke は cookie 付きのリクエストから session を破棄する。
func (m *Manager) Revoke(c *gin.Context) {
	if id, err := c.Cookie(SessionCookieName); err == nil && id != "" {
		_ = m.store.Sessions.Delete(id)
	}
	m.clearSessionCookie(c)
}

// RequireUser は gin ミドルウェア。session cookie から user を解決し、
// gin.Context に詰める。未認証なら 401 で abort。
func (m *Manager) RequireUser() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := m.resolveUser(c)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{
				"error":   "unauthorized",
				"message": "authentication required",
			})
			return
		}
		c.Set("user", user)
		ctx := context.WithValue(c.Request.Context(), userContextKey{}, user)
		c.Request = c.Request.WithContext(ctx)
		c.Next()
	}
}

// CurrentUser は gin.Context から認証ユーザーを取得する。未認証なら nil。
func CurrentUser(c *gin.Context) *store.User {
	v, ok := c.Get("user")
	if !ok {
		return nil
	}
	u, _ := v.(*store.User)
	return u
}

// RequireAdmin は RequireUser の後段に置いて admin ロールのみ通すミドルウェア。
// 認証チェックは RequireUser に任せる前提なので、CurrentUser が nil なら 401、admin でなければ 403。
func (m *Manager) RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		user := CurrentUser(c)
		if user == nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		if user.Role != store.RoleAdmin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error":   "forbidden",
				"message": "admin role required",
			})
			return
		}
		c.Next()
	}
}

// resolveUser は cookie の session ID から user を取得する。
func (m *Manager) resolveUser(c *gin.Context) (*store.User, error) {
	id, err := c.Cookie(SessionCookieName)
	if err != nil || id == "" {
		return nil, ErrInvalidCredentials
	}
	sess, err := m.store.Sessions.Get(id)
	if err != nil {
		return nil, err
	}
	return m.store.Users.GetByID(sess.UserID)
}

func (m *Manager) setSessionCookie(c *gin.Context, id string, maxAge int) {
	c.SetSameSite(m.cfg.SameSite)
	c.SetCookie(SessionCookieName, id, maxAge, "/", m.cfg.Domain, m.cfg.Secure, true)
}

func (m *Manager) clearSessionCookie(c *gin.Context) {
	c.SetSameSite(m.cfg.SameSite)
	c.SetCookie(SessionCookieName, "", -1, "/", m.cfg.Domain, m.cfg.Secure, true)
}
