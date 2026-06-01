package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// User はアプリケーションのユーザーを表す（password_hash は API レスポンス用には除外）。
type User struct {
	ID        int64
	Username  string
	CreatedAt time.Time
	IsActive  bool
}

// ErrUserNotFound はユーザー検索でレコードが見つからなかったときに返す。
var ErrUserNotFound = errors.New("user not found")

// UserRepo は users テーブルに対する操作をまとめる。
type UserRepo struct {
	db *sql.DB
}

// Count はアクティブ／非アクティブを問わず全ユーザー数を返す（セットアップ判定用）。
func (r *UserRepo) Count() (int, error) {
	var n int
	if err := r.db.QueryRow(`SELECT COUNT(*) FROM users`).Scan(&n); err != nil {
		return 0, fmt.Errorf("count users: %w", err)
	}
	return n, nil
}

// Create は新しいユーザーを作成する。username は UNIQUE。
func (r *UserRepo) Create(username, passwordHash string) (*User, error) {
	now := time.Now().Unix()
	res, err := r.db.Exec(
		`INSERT INTO users (username, password_hash, created_at, is_active) VALUES (?, ?, ?, 1)`,
		username, passwordHash, now,
	)
	if err != nil {
		return nil, fmt.Errorf("insert user: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}
	return &User{
		ID:        id,
		Username:  username,
		CreatedAt: time.Unix(now, 0),
		IsActive:  true,
	}, nil
}

// GetByUsername は username（active のみ）でユーザーと password_hash を取得する。
func (r *UserRepo) GetByUsername(username string) (*User, string, error) {
	row := r.db.QueryRow(
		`SELECT id, username, password_hash, created_at, is_active
		 FROM users WHERE username = ? AND is_active = 1`,
		username,
	)
	var (
		u        User
		hash     string
		isActive int
		created  int64
	)
	if err := row.Scan(&u.ID, &u.Username, &hash, &created, &isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, "", ErrUserNotFound
		}
		return nil, "", fmt.Errorf("scan user: %w", err)
	}
	u.CreatedAt = time.Unix(created, 0)
	u.IsActive = isActive == 1
	return &u, hash, nil
}

// GetByID は id でユーザーを取得する（session 復元用）。
func (r *UserRepo) GetByID(id int64) (*User, error) {
	row := r.db.QueryRow(
		`SELECT id, username, created_at, is_active
		 FROM users WHERE id = ? AND is_active = 1`,
		id,
	)
	var (
		u        User
		isActive int
		created  int64
	)
	if err := row.Scan(&u.ID, &u.Username, &created, &isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("scan user: %w", err)
	}
	u.CreatedAt = time.Unix(created, 0)
	u.IsActive = isActive == 1
	return &u, nil
}
