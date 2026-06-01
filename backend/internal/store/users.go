package store

import (
	"database/sql"
	"errors"
	"fmt"
	"time"
)

// Role はユーザーの権限ロール。
type Role string

const (
	RoleAdmin  Role = "admin"
	RoleMember Role = "member"
)

// IsValid は role 文字列が定義済みのいずれかであるかを返す。
func (r Role) IsValid() bool { return r == RoleAdmin || r == RoleMember }

// User はアプリケーションのユーザーを表す（password_hash は API レスポンス用には除外）。
type User struct {
	ID        int64
	Username  string
	Role      Role
	CreatedAt time.Time
	IsActive  bool
}

// ErrUserNotFound はユーザー検索でレコードが見つからなかったときに返す。
var ErrUserNotFound = errors.New("user not found")

// ErrUsernameTaken は重複 username で Create された場合に返す。
var ErrUsernameTaken = errors.New("username already taken")

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
// role を空文字で渡すと "member" として作成する。
func (r *UserRepo) Create(username, passwordHash string, role Role) (*User, error) {
	if role == "" {
		role = RoleMember
	}
	if !role.IsValid() {
		return nil, fmt.Errorf("invalid role: %q", role)
	}
	now := time.Now().Unix()
	res, err := r.db.Exec(
		`INSERT INTO users (username, password_hash, created_at, is_active, role) VALUES (?, ?, ?, 1, ?)`,
		username, passwordHash, now, string(role),
	)
	if err != nil {
		// modernc.org/sqlite は UNIQUE 制約違反を文字列で含むので簡易判定。
		if errMsgContains(err, "UNIQUE") {
			return nil, ErrUsernameTaken
		}
		return nil, fmt.Errorf("insert user: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("last insert id: %w", err)
	}
	return &User{
		ID:        id,
		Username:  username,
		Role:      role,
		CreatedAt: time.Unix(now, 0),
		IsActive:  true,
	}, nil
}

// CreateAdmin は初期セットアップ用に admin ロールでユーザーを作成する。
func (r *UserRepo) CreateAdmin(username, passwordHash string) (*User, error) {
	return r.Create(username, passwordHash, RoleAdmin)
}

// List は全ユーザーを取得する（admin の管理画面向け）。
func (r *UserRepo) List() ([]*User, error) {
	rows, err := r.db.Query(
		`SELECT id, username, role, created_at, is_active FROM users ORDER BY id ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("query users: %w", err)
	}
	defer rows.Close()

	var out []*User
	for rows.Next() {
		u, err := scanUser(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return out, nil
}

// GetByUsername は username（active のみ）でユーザーと password_hash を取得する。
func (r *UserRepo) GetByUsername(username string) (*User, string, error) {
	row := r.db.QueryRow(
		`SELECT id, username, password_hash, role, created_at, is_active
		 FROM users WHERE username = ? AND is_active = 1`,
		username,
	)
	var (
		u        User
		hash     string
		role     string
		isActive int
		created  int64
	)
	if err := row.Scan(&u.ID, &u.Username, &hash, &role, &created, &isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, "", ErrUserNotFound
		}
		return nil, "", fmt.Errorf("scan user: %w", err)
	}
	u.Role = Role(role)
	u.CreatedAt = time.Unix(created, 0)
	u.IsActive = isActive == 1
	return &u, hash, nil
}

// GetByID は id でユーザーを取得する（session 復元用）。
func (r *UserRepo) GetByID(id int64) (*User, error) {
	row := r.db.QueryRow(
		`SELECT id, username, role, created_at, is_active
		 FROM users WHERE id = ? AND is_active = 1`,
		id,
	)
	return scanUserRow(row)
}

// UpdateRole は user の role を変更する。
func (r *UserRepo) UpdateRole(id int64, role Role) error {
	if !role.IsValid() {
		return fmt.Errorf("invalid role: %q", role)
	}
	res, err := r.db.Exec(`UPDATE users SET role = ? WHERE id = ?`, string(role), id)
	if err != nil {
		return fmt.Errorf("update role: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return ErrUserNotFound
	}
	return nil
}

// Delete は user を物理削除する（cascade で sessions / mcp_tokens も消える）。
func (r *UserRepo) Delete(id int64) error {
	res, err := r.db.Exec(`DELETE FROM users WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		return ErrUserNotFound
	}
	return nil
}

// CountAdmins は admin ロールの user 数を返す（最終 admin 削除防止のため）。
func (r *UserRepo) CountAdmins() (int, error) {
	var n int
	if err := r.db.QueryRow(
		`SELECT COUNT(*) FROM users WHERE role = ? AND is_active = 1`,
		string(RoleAdmin),
	).Scan(&n); err != nil {
		return 0, fmt.Errorf("count admins: %w", err)
	}
	return n, nil
}

// scanUserRow は QueryRow の結果から User を 1 件読み取る。
func scanUserRow(row *sql.Row) (*User, error) {
	var (
		u        User
		role     string
		isActive int
		created  int64
	)
	if err := row.Scan(&u.ID, &u.Username, &role, &created, &isActive); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("scan user: %w", err)
	}
	u.Role = Role(role)
	u.CreatedAt = time.Unix(created, 0)
	u.IsActive = isActive == 1
	return &u, nil
}

// scanUser は Rows から User を 1 件読み取る。
func scanUser(rows *sql.Rows) (*User, error) {
	var (
		u        User
		role     string
		isActive int
		created  int64
	)
	if err := rows.Scan(&u.ID, &u.Username, &role, &created, &isActive); err != nil {
		return nil, fmt.Errorf("scan user: %w", err)
	}
	u.Role = Role(role)
	u.CreatedAt = time.Unix(created, 0)
	u.IsActive = isActive == 1
	return &u, nil
}

func errMsgContains(err error, s string) bool {
	return err != nil && containsCI(err.Error(), s)
}

// containsCI は文字列の大文字小文字を無視した部分一致判定。
func containsCI(s, sub string) bool {
	// strings.Contains は CI 比較を持たないため簡易実装。
	if len(sub) == 0 {
		return true
	}
	for i := 0; i+len(sub) <= len(s); i++ {
		match := true
		for j := 0; j < len(sub); j++ {
			a, b := s[i+j], sub[j]
			if a >= 'A' && a <= 'Z' {
				a += 'a' - 'A'
			}
			if b >= 'A' && b <= 'Z' {
				b += 'a' - 'A'
			}
			if a != b {
				match = false
				break
			}
		}
		if match {
			return true
		}
	}
	return false
}
