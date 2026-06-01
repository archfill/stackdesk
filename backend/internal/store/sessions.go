package store

import (
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"time"
)

// ErrSessionNotFound は session ID が存在しない／期限切れ時に返す。
var ErrSessionNotFound = errors.New("session not found")

// Session は認証済みクライアントのセッションを表す。
type Session struct {
	UserID    int64
	CreatedAt time.Time
	ExpiresAt time.Time
	UserAgent string
}

// SessionRepo は sessions テーブルに対する操作をまとめる。
type SessionRepo struct {
	db *sql.DB
}

// NewSessionRepo は sessions リポジトリを構築する。
func NewSessionRepo(db *sql.DB) *SessionRepo {
	return &SessionRepo{db: db}
}

// Create は新しい session を作成し、クライアントへ渡す平文 ID を返す。
// DB には sha256(plaintext) のみ保存する。
func (r *SessionRepo) Create(userID int64, ttl time.Duration, userAgent string) (string, *Session, error) {
	id, err := generateSessionID()
	if err != nil {
		return "", nil, err
	}
	idHash := hashSessionID(id)
	now := time.Now()
	expires := now.Add(ttl)

	if _, err := r.db.Exec(
		`INSERT INTO sessions (id_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)`,
		idHash, userID, now.Unix(), expires.Unix(), userAgent,
	); err != nil {
		return "", nil, fmt.Errorf("insert session: %w", err)
	}

	return id, &Session{
		UserID:    userID,
		CreatedAt: now,
		ExpiresAt: expires,
		UserAgent: userAgent,
	}, nil
}

// Get は平文 session ID から session を取得する（期限切れは ErrSessionNotFound）。
func (r *SessionRepo) Get(id string) (*Session, error) {
	idHash := hashSessionID(id)
	row := r.db.QueryRow(
		`SELECT user_id, created_at, expires_at, COALESCE(user_agent, '')
		 FROM sessions WHERE id_hash = ?`,
		idHash,
	)
	var (
		s            Session
		created, exp int64
		ua           string
	)
	if err := row.Scan(&s.UserID, &created, &exp, &ua); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSessionNotFound
		}
		return nil, fmt.Errorf("scan session: %w", err)
	}
	s.CreatedAt = time.Unix(created, 0)
	s.ExpiresAt = time.Unix(exp, 0)
	s.UserAgent = ua
	if time.Now().After(s.ExpiresAt) {
		// 期限切れは見つからなかったものとして扱う（実体は cleanup 任せ）。
		return nil, ErrSessionNotFound
	}
	return &s, nil
}

// Delete は session を 1 件削除する（ログアウト）。
func (r *SessionRepo) Delete(id string) error {
	idHash := hashSessionID(id)
	if _, err := r.db.Exec(`DELETE FROM sessions WHERE id_hash = ?`, idHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteExpired は期限切れ session をまとめて削除する。
func (r *SessionRepo) DeleteExpired() error {
	_, err := r.db.Exec(`DELETE FROM sessions WHERE expires_at <= ?`, time.Now().Unix())
	return err
}

// generateSessionID は 32 byte の暗号学的ランダム値を base64 url-safe で返す。
func generateSessionID() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("rand: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}

// hashSessionID は session ID を SHA-256 hex で固定長文字列にする。
func hashSessionID(id string) string {
	sum := sha256.Sum256([]byte(id))
	return hex.EncodeToString(sum[:])
}
