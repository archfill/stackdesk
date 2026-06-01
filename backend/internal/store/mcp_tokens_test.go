package store

import (
	"errors"
	"strings"
	"testing"
)

func TestMCPTokenCreateAndVerify(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "hash")

	plain, tok, err := s.MCPTokens.Create(u.ID, "laptop")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if !strings.HasPrefix(plain, "sdt_") {
		t.Errorf("plaintext = %q; expected sdt_ prefix", plain)
	}
	if tok.Prefix == "" || !strings.HasPrefix(plain, tok.Prefix) {
		t.Errorf("Prefix = %q must be a prefix of plaintext", tok.Prefix)
	}

	userID, err := s.MCPTokens.VerifyPlaintext(plain)
	if err != nil {
		t.Fatalf("Verify: %v", err)
	}
	if userID != u.ID {
		t.Errorf("VerifyPlaintext = %d, want %d", userID, u.ID)
	}
}

func TestMCPTokenUnknownAndRevoked(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "hash")

	if _, err := s.MCPTokens.VerifyPlaintext("sdt_unknown"); !errors.Is(err, ErrTokenNotFound) {
		t.Errorf("unknown token err = %v, want ErrTokenNotFound", err)
	}

	plain, tok, err := s.MCPTokens.Create(u.ID, "t")
	if err != nil {
		t.Fatal(err)
	}
	if err := s.MCPTokens.Revoke(u.ID, tok.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.MCPTokens.VerifyPlaintext(plain); !errors.Is(err, ErrTokenNotFound) {
		t.Errorf("revoked token err = %v, want ErrTokenNotFound", err)
	}

	// 二重 revoke は ErrTokenNotFound（既に失効しているため対象なし扱い）。
	if err := s.MCPTokens.Revoke(u.ID, tok.ID); !errors.Is(err, ErrTokenNotFound) {
		t.Errorf("double revoke err = %v, want ErrTokenNotFound", err)
	}

	// 別ユーザーが他人の token を revoke しようとしても ErrTokenNotFound。
	other, _ := s.Users.Create("alice", "hash2", RoleMember)
	_, otherTok, _ := s.MCPTokens.Create(other.ID, "alice-laptop")
	if err := s.MCPTokens.Revoke(u.ID, otherTok.ID); !errors.Is(err, ErrTokenNotFound) {
		t.Errorf("cross-user revoke err = %v, want ErrTokenNotFound", err)
	}
}

func TestMCPTokenListByUserScope(t *testing.T) {
	s := openTestStore(t)
	u1, _ := s.Users.CreateAdmin("admin", "h")
	u2, _ := s.Users.Create("alice", "h2", RoleMember)

	_, _, _ = s.MCPTokens.Create(u1.ID, "u1-a")
	_, _, _ = s.MCPTokens.Create(u1.ID, "u1-b")
	_, _, _ = s.MCPTokens.Create(u2.ID, "u2-a")

	a, _ := s.MCPTokens.ListByUser(u1.ID)
	if len(a) != 2 {
		t.Errorf("u1 list len = %d, want 2", len(a))
	}
	b, _ := s.MCPTokens.ListByUser(u2.ID)
	if len(b) != 1 {
		t.Errorf("u2 list len = %d, want 1", len(b))
	}
}

func TestMCPTokenPlaintextNotStored(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "h")

	plain, _, err := s.MCPTokens.Create(u.ID, "leak-check")
	if err != nil {
		t.Fatal(err)
	}
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM mcp_tokens WHERE token_hash = ?`, plain).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Error("plaintext token must not be present in token_hash column")
	}
}
