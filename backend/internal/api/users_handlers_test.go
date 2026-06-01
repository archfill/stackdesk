package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"docker-manager/internal/auth"
	"docker-manager/internal/store"

	"github.com/gin-gonic/gin"
)

type usersTestEnv struct {
	r     *gin.Engine
	store *store.Store
	mgr   *auth.Manager
}

func setupUsersEnv(t *testing.T) *usersTestEnv {
	t.Helper()
	gin.SetMode(gin.TestMode)
	s, err := store.Open(":memory:")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = s.Close() })

	mgr := auth.NewManager(s, auth.Config{SameSite: http.SameSiteLaxMode})
	r := gin.New()
	auth.NewHandler(s, mgr).RegisterRoutes(r)

	adminAPI := r.Group("/api", mgr.RequireUser(), mgr.RequireAdmin())
	NewUsersHandler(s).RegisterUserRoutes(adminAPI)
	return &usersTestEnv{r: r, store: s, mgr: mgr}
}

func mustLogin(t *testing.T, r *gin.Engine, username, password string) string {
	t.Helper()
	body := strings.NewReader(`{"username":"` + username + `","password":"` + password + `"}`)
	req := httptest.NewRequest(http.MethodPost, "/api/auth/login", body)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("login failed: %d %s", rec.Code, rec.Body.String())
	}
	for _, c := range rec.Result().Cookies() {
		if c.Name == auth.SessionCookieName {
			return c.Value
		}
	}
	t.Fatal("session cookie missing")
	return ""
}

// doWithCookie runs a request authenticated via session cookie.
func doWithCookie(r *gin.Engine, method, path, sid, body string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.AddCookie(&http.Cookie{Name: auth.SessionCookieName, Value: sid})
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

func seedAdmin(t *testing.T, s *store.Store) {
	t.Helper()
	h, _ := auth.HashPassword("admin-pass-1")
	if _, err := s.Users.CreateAdmin("admin", h); err != nil {
		t.Fatal(err)
	}
}

func TestUsersAPI_ListAndCreate(t *testing.T) {
	env := setupUsersEnv(t)
	seedAdmin(t, env.store)
	sid := mustLogin(t, env.r, "admin", "admin-pass-1")

	t.Run("list initially returns one admin", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodGet, "/api/users", sid, "")
		if rec.Code != http.StatusOK {
			t.Fatalf("status = %d", rec.Code)
		}
		var resp struct {
			Users []map[string]any `json:"users"`
		}
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatal(err)
		}
		if len(resp.Users) != 1 || resp.Users[0]["role"] != "admin" {
			t.Errorf("unexpected users: %#v", resp.Users)
		}
	})

	t.Run("create member", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodPost, "/api/users", sid,
			`{"username":"alice","password":"alice-pass-1","role":"member"}`)
		if rec.Code != http.StatusCreated {
			t.Fatalf("status = %d body=%s", rec.Code, rec.Body.String())
		}
	})

	t.Run("duplicate username returns 409", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodPost, "/api/users", sid,
			`{"username":"alice","password":"another-pass","role":"member"}`)
		if rec.Code != http.StatusConflict {
			t.Errorf("status = %d, want 409 body=%s", rec.Code, rec.Body.String())
		}
	})

	t.Run("short password returns 400", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodPost, "/api/users", sid,
			`{"username":"bob","password":"short","role":"member"}`)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})

	t.Run("invalid role returns 400", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodPost, "/api/users", sid,
			`{"username":"carol","password":"carol-pass-1","role":"god"}`)
		if rec.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", rec.Code)
		}
	})
}

func TestUsersAPI_SelfAndLastAdminGuards(t *testing.T) {
	env := setupUsersEnv(t)
	seedAdmin(t, env.store)
	sid := mustLogin(t, env.r, "admin", "admin-pass-1")

	t.Run("cannot demote last admin", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodPatch, "/api/users/1/role", sid, `{"role":"member"}`)
		if rec.Code != http.StatusConflict {
			t.Errorf("status = %d, want 409 body=%s", rec.Code, rec.Body.String())
		}
	})

	t.Run("cannot self-delete", func(t *testing.T) {
		rec := doWithCookie(env.r, http.MethodDelete, "/api/users/1", sid, "")
		if rec.Code != http.StatusConflict {
			t.Errorf("status = %d, want 409", rec.Code)
		}
	})

	t.Run("promoting a second admin relaxes the guard", func(t *testing.T) {
		create := doWithCookie(env.r, http.MethodPost, "/api/users", sid,
			`{"username":"alice","password":"alice-pass-1","role":"admin"}`)
		if create.Code != http.StatusCreated {
			t.Fatalf("create: %d %s", create.Code, create.Body.String())
		}
		demote := doWithCookie(env.r, http.MethodPatch, "/api/users/1/role", sid, `{"role":"member"}`)
		if demote.Code != http.StatusOK {
			t.Errorf("demote status = %d, want 200 body=%s", demote.Code, demote.Body.String())
		}
	})
}

func TestUsersAPI_MemberForbidden(t *testing.T) {
	env := setupUsersEnv(t)
	seedAdmin(t, env.store)
	memberHash, _ := auth.HashPassword("member-pass-1")
	_, _ = env.store.Users.Create("alice", memberHash, store.RoleMember)

	sid := mustLogin(t, env.r, "alice", "member-pass-1")
	rec := doWithCookie(env.r, http.MethodGet, "/api/users", sid, "")
	if rec.Code != http.StatusForbidden {
		t.Errorf("member status = %d, want 403", rec.Code)
	}
}
