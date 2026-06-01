package mcp

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"docker-manager/internal/store"

	"github.com/modelcontextprotocol/go-sdk/auth"
)

// newTestStore は in-memory SQLite を初期化して、テスト用ユーザー 1 件を作成し、
// 関連するクリーンアップを呼び出し側で行えるよう store を返す。
func newTestStore(t *testing.T) (*store.Store, int64) {
	t.Helper()
	s, err := store.Open(":memory:")
	if err != nil {
		t.Fatalf("open store: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })

	u, err := s.Users.Create("alice", "$2a$10$placeholderHashThatBcryptCannotVerify")
	if err != nil {
		t.Fatalf("create user: %v", err)
	}
	return s, u.ID
}

func TestStoreTokenVerifier(t *testing.T) {
	s, userID := newTestStore(t)
	plaintext, _, err := s.MCPTokens.Create(userID, "test")
	if err != nil {
		t.Fatalf("create token: %v", err)
	}
	verify := storeTokenVerifier(s)

	t.Run("valid token", func(t *testing.T) {
		info, err := verify(context.Background(), plaintext, nil)
		if err != nil {
			t.Fatalf("unexpected err: %v", err)
		}
		if info == nil {
			t.Fatal("expected non-nil TokenInfo")
		}
		if len(info.Scopes) != 1 || info.Scopes[0] != requiredScope {
			t.Errorf("scopes = %v, want [%s]", info.Scopes, requiredScope)
		}
		if info.Expiration.IsZero() {
			t.Error("Expiration must be set so RequireBearerToken accepts it")
		}
	})

	t.Run("unknown token", func(t *testing.T) {
		_, err := verify(context.Background(), "dmt_unknown", nil)
		if !errors.Is(err, auth.ErrInvalidToken) {
			t.Errorf("err = %v, want ErrInvalidToken", err)
		}
	})

	t.Run("revoked token", func(t *testing.T) {
		revokedPlain, tok, err := s.MCPTokens.Create(userID, "to-revoke")
		if err != nil {
			t.Fatalf("create token: %v", err)
		}
		if err := s.MCPTokens.Revoke(userID, tok.ID); err != nil {
			t.Fatalf("revoke: %v", err)
		}
		_, err = verify(context.Background(), revokedPlain, nil)
		if !errors.Is(err, auth.ErrInvalidToken) {
			t.Errorf("err = %v, want ErrInvalidToken", err)
		}
	})
}

func TestNewMCPAuth(t *testing.T) {
	s, userID := newTestStore(t)
	plaintext, _, err := s.MCPTokens.Create(userID, "test")
	if err != nil {
		t.Fatalf("create token: %v", err)
	}

	// docker.Client は nil でも、認証層は middleware → handler の順なので
	// 認証失敗時は handler に到達せず nil 参照を踏まない。
	h := New(nil, s)
	srv := httptest.NewServer(h)
	defer srv.Close()

	body := `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}`

	cases := []struct {
		name       string
		authHeader string
		wantStatus int
	}{
		{"no header", "", http.StatusUnauthorized},
		{"wrong scheme", "Token " + plaintext, http.StatusUnauthorized},
		{"wrong token", "Bearer dmt_wrong", http.StatusUnauthorized},
		{"correct token", "Bearer " + plaintext, http.StatusOK},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(http.MethodPost, srv.URL, strings.NewReader(body))
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Accept", "application/json, text/event-stream")
			if tc.authHeader != "" {
				req.Header.Set("Authorization", tc.authHeader)
			}
			resp, err := http.DefaultClient.Do(req)
			if err != nil {
				t.Fatal(err)
			}
			_ = resp.Body.Close()
			if resp.StatusCode != tc.wantStatus {
				t.Errorf("status = %d, want %d", resp.StatusCode, tc.wantStatus)
			}
		})
	}
}
