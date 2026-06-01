package mcp

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/modelcontextprotocol/go-sdk/auth"
)

func TestStaticTokenVerifier(t *testing.T) {
	verify := staticTokenVerifier("right-token")

	t.Run("correct token", func(t *testing.T) {
		info, err := verify(context.Background(), "right-token", nil)
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

	t.Run("wrong token", func(t *testing.T) {
		_, err := verify(context.Background(), "wrong-token", nil)
		if !errors.Is(err, auth.ErrInvalidToken) {
			t.Errorf("err = %v, want ErrInvalidToken", err)
		}
	})

	t.Run("empty token", func(t *testing.T) {
		_, err := verify(context.Background(), "", nil)
		if !errors.Is(err, auth.ErrInvalidToken) {
			t.Errorf("err = %v, want ErrInvalidToken", err)
		}
	})
}

func TestNewMCPAuth(t *testing.T) {
	// docker.Client は nil でも、認証層は middleware → handler の順なので
	// 認証失敗時は handler に到達せず、nil 参照を踏まない。
	h := New(nil, "secret-token")
	srv := httptest.NewServer(h)
	defer srv.Close()

	body := `{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"t","version":"0"}}}`

	cases := []struct {
		name       string
		authHeader string
		wantStatus int
	}{
		{"no header", "", http.StatusUnauthorized},
		{"wrong scheme", "Token secret-token", http.StatusUnauthorized},
		{"wrong token", "Bearer wrong-token", http.StatusUnauthorized},
		{"correct token", "Bearer secret-token", http.StatusOK},
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
