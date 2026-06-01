package auth

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/archfill/stackdesk/internal/store"

	"github.com/gin-gonic/gin"
)

// newTestRouter builds a gin engine with the auth manager wired and a
// minimal API surface so tests can exercise RequireUser / RequireAdmin.
func newTestRouter(t *testing.T) (*gin.Engine, *store.Store, *Manager) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	s, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })

	mgr := NewManager(s, Config{Secure: false, SameSite: http.SameSiteLaxMode})
	r := gin.New()
	NewHandler(s, mgr).RegisterRoutes(r)

	auth := r.Group("/api", mgr.RequireUser())
	auth.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"user": CurrentUser(c).Username})
	})

	admin := r.Group("/api/admin", mgr.RequireUser(), mgr.RequireAdmin())
	admin.GET("/ping", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return r, s, mgr
}

// extractSessionCookie pulls the stackdesk_session cookie value out of a response.
func extractSessionCookie(t *testing.T, resp *http.Response) string {
	t.Helper()
	for _, c := range resp.Cookies() {
		if c.Name == SessionCookieName {
			return c.Value
		}
	}
	t.Fatal("stackdesk_session cookie not set on response")
	return ""
}

func performLogin(t *testing.T, r *gin.Engine, username, password string) string {
	t.Helper()
	body := strings.NewReader(`{"username":"` + username + `","password":"` + password + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login failed: status=%d body=%s", rec.Code, rec.Body.String())
	}
	return extractSessionCookie(t, rec.Result())
}

func TestRequireUser(t *testing.T) {
	r, s, _ := newTestRouter(t)
	hash, _ := HashPassword("pw-correct")
	_, _ = s.Users.CreateAdmin("admin", hash)

	t.Run("unauthenticated → 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", rec.Code)
		}
	})

	t.Run("authenticated → 200", func(t *testing.T) {
		sid := performLogin(t, r, "admin", "pw-correct")
		req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sid})
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, body=%s", rec.Code, rec.Body.String())
		}
		body, _ := io.ReadAll(rec.Result().Body)
		if !strings.Contains(string(body), `"user":"admin"`) {
			t.Errorf("body should reflect logged-in user: %s", body)
		}
	})

	t.Run("logout invalidates session", func(t *testing.T) {
		sid := performLogin(t, r, "admin", "pw-correct")
		logoutReq := httptest.NewRequest(http.MethodPost, "/api/auth/logout", nil)
		logoutReq.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sid})
		logoutRec := httptest.NewRecorder()
		r.ServeHTTP(logoutRec, logoutReq)
		if logoutRec.Code != http.StatusNoContent {
			t.Fatalf("logout status = %d", logoutRec.Code)
		}

		req := httptest.NewRequest(http.MethodGet, "/api/ping", nil)
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sid})
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status after logout = %d, want 401", rec.Code)
		}
	})
}

func TestRequireAdmin(t *testing.T) {
	r, s, _ := newTestRouter(t)
	adminHash, _ := HashPassword("pw-admin")
	memberHash, _ := HashPassword("pw-member")
	_, _ = s.Users.CreateAdmin("admin", adminHash)
	_, _ = s.Users.Create("alice", memberHash, store.RoleMember)

	t.Run("member → 403", func(t *testing.T) {
		sid := performLogin(t, r, "alice", "pw-member")
		req := httptest.NewRequest(http.MethodGet, "/api/admin/ping", nil)
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sid})
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusForbidden {
			t.Errorf("status = %d, want 403", rec.Code)
		}
	})

	t.Run("admin → 200", func(t *testing.T) {
		sid := performLogin(t, r, "admin", "pw-admin")
		req := httptest.NewRequest(http.MethodGet, "/api/admin/ping", nil)
		req.AddCookie(&http.Cookie{Name: SessionCookieName, Value: sid})
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusOK {
			t.Errorf("status = %d, want 200", rec.Code)
		}
	})

	t.Run("unauthenticated → 401", func(t *testing.T) {
		req := httptest.NewRequest(http.MethodGet, "/api/admin/ping", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", rec.Code)
		}
	})
}
