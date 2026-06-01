package store

import (
	"database/sql"
	"errors"
	"testing"
	"time"
)

func TestSessionCRUD(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "hash")

	id, sess, err := s.Sessions.Create(u.ID, time.Hour, "agent/1.0")
	if err != nil {
		t.Fatalf("Create: %v", err)
	}
	if id == "" {
		t.Fatal("session id must not be empty")
	}
	if sess.UserAgent != "agent/1.0" {
		t.Errorf("UserAgent = %q", sess.UserAgent)
	}
	if sess.UserID != u.ID {
		t.Errorf("UserID = %d, want %d", sess.UserID, u.ID)
	}

	got, err := s.Sessions.Get(id)
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.UserID != u.ID {
		t.Errorf("Get UserID = %d, want %d", got.UserID, u.ID)
	}

	if err := s.Sessions.Delete(id); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := s.Sessions.Get(id); !errors.Is(err, ErrSessionNotFound) {
		t.Errorf("after Delete Get err = %v, want ErrSessionNotFound", err)
	}
}

func TestSessionExpiry(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "hash")

	// 既に期限切れの session を直接挿入する。
	expiredHash := hashSessionID("expired")
	if _, err := s.db.Exec(
		`INSERT INTO sessions (id_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, '')`,
		expiredHash, u.ID, time.Now().Add(-2*time.Hour).Unix(), time.Now().Add(-1*time.Hour).Unix(),
	); err != nil {
		t.Fatal(err)
	}

	if _, err := s.Sessions.Get("expired"); !errors.Is(err, ErrSessionNotFound) {
		t.Errorf("expired Get err = %v, want ErrSessionNotFound", err)
	}

	// DeleteExpired は実体を消す。
	if err := s.Sessions.DeleteExpired(); err != nil {
		t.Fatal(err)
	}
	var rows int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE id_hash = ?`, expiredHash).Scan(&rows); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			t.Fatal(err)
		}
	}
	if rows != 0 {
		t.Errorf("DeleteExpired should have removed the row; got %d remaining", rows)
	}
}

func TestSessionIDIsHashed(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "hash")

	id, _, err := s.Sessions.Create(u.ID, time.Hour, "")
	if err != nil {
		t.Fatal(err)
	}

	// 平文の session id が DB に存在しないこと（hash 化保存の検証）。
	var n int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM sessions WHERE id_hash = ?`, id).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Error("plaintext session id should not be present in id_hash column")
	}
}
