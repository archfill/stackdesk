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

// ErrTokenNotFound はトークン検索でレコードが見つからなかったときに返す。
var ErrTokenNotFound = errors.New("mcp token not found")

// tokenPlaintextPrefix は発行する MCP トークンの先頭固定プレフィックス。
const tokenPlaintextPrefix = "dmt_"

// tokenPrefixLen は UI に表示するための先頭 N 文字（plaintext のうち）。
const tokenPrefixLen = 12

// MCPToken は MCP 認証に使う発行済みトークンのメタデータ。
// 平文トークンは Create() の戻り値でしか取得できず、DB には sha256(plaintext) のみ保存される。
type MCPToken struct {
	ID         int64
	UserID     int64
	Name       string
	Prefix     string
	CreatedAt  time.Time
	LastUsedAt *time.Time
	RevokedAt  *time.Time
}

// IsRevoked は失効済みかどうかを返す。
func (t *MCPToken) IsRevoked() bool { return t.RevokedAt != nil }

// MCPTokenRepo は mcp_tokens テーブルへの操作をまとめる。
type MCPTokenRepo struct {
	db *sql.DB
}

// NewMCPTokenRepo は MCPTokenRepo を構築する。
func NewMCPTokenRepo(db *sql.DB) *MCPTokenRepo {
	return &MCPTokenRepo{db: db}
}

// Create は新しいトークンを生成し、平文と DB レコードのメタを返す。
func (r *MCPTokenRepo) Create(userID int64, name string) (string, *MCPToken, error) {
	plaintext, err := generateMCPToken()
	if err != nil {
		return "", nil, err
	}
	hash := hashMCPToken(plaintext)
	prefix := plaintext
	if len(prefix) > tokenPrefixLen {
		prefix = plaintext[:tokenPrefixLen]
	}
	now := time.Now()
	res, err := r.db.Exec(
		`INSERT INTO mcp_tokens (user_id, name, token_hash, prefix, created_at) VALUES (?, ?, ?, ?, ?)`,
		userID, name, hash, prefix, now.Unix(),
	)
	if err != nil {
		return "", nil, fmt.Errorf("insert mcp_token: %w", err)
	}
	id, err := res.LastInsertId()
	if err != nil {
		return "", nil, fmt.Errorf("last insert id: %w", err)
	}
	return plaintext, &MCPToken{
		ID:        id,
		UserID:    userID,
		Name:      name,
		Prefix:    prefix,
		CreatedAt: now,
	}, nil
}

// ListByUser は指定ユーザーのトークン一覧を作成日降順で返す（失効済みも含む）。
func (r *MCPTokenRepo) ListByUser(userID int64) ([]*MCPToken, error) {
	rows, err := r.db.Query(
		`SELECT id, user_id, name, prefix, created_at, last_used_at, revoked_at
		 FROM mcp_tokens WHERE user_id = ? ORDER BY created_at DESC`,
		userID,
	)
	if err != nil {
		return nil, fmt.Errorf("query mcp_tokens: %w", err)
	}
	defer rows.Close()

	var out []*MCPToken
	for rows.Next() {
		t, err := scanMCPToken(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate mcp_tokens: %w", err)
	}
	return out, nil
}

// Revoke は user_id 一致 + id 一致のトークンを失効状態にする（soft delete）。
// 既に失効済みの場合は no-op（追加 update なし）。
func (r *MCPTokenRepo) Revoke(userID, id int64) error {
	res, err := r.db.Exec(
		`UPDATE mcp_tokens SET revoked_at = ?
		 WHERE id = ? AND user_id = ? AND revoked_at IS NULL`,
		time.Now().Unix(), id, userID,
	)
	if err != nil {
		return fmt.Errorf("revoke mcp_token: %w", err)
	}
	n, err := res.RowsAffected()
	if err != nil {
		return fmt.Errorf("rows affected: %w", err)
	}
	if n == 0 {
		// 該当 user の有効トークンが見つからない（既に失効 or 別 user の token）。
		return ErrTokenNotFound
	}
	return nil
}

// VerifyPlaintext は平文トークンが有効なら所属 user_id を返し、last_used_at を更新する。
// 失効済み・存在しない場合は ErrTokenNotFound。
func (r *MCPTokenRepo) VerifyPlaintext(plaintext string) (int64, error) {
	hash := hashMCPToken(plaintext)
	row := r.db.QueryRow(
		`SELECT id, user_id, revoked_at FROM mcp_tokens WHERE token_hash = ?`,
		hash,
	)
	var (
		id        int64
		userID    int64
		revokedAt sql.NullInt64
	)
	if err := row.Scan(&id, &userID, &revokedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrTokenNotFound
		}
		return 0, fmt.Errorf("scan mcp_token: %w", err)
	}
	if revokedAt.Valid {
		return 0, ErrTokenNotFound
	}
	// last_used_at は best-effort で更新（失敗しても認証自体は成立）。
	_, _ = r.db.Exec(`UPDATE mcp_tokens SET last_used_at = ? WHERE id = ?`, time.Now().Unix(), id)
	return userID, nil
}

// scanMCPToken は rows.Scan の結果を MCPToken に詰める。
func scanMCPToken(rows *sql.Rows) (*MCPToken, error) {
	var (
		t         MCPToken
		created   int64
		lastUsed  sql.NullInt64
		revokedAt sql.NullInt64
	)
	if err := rows.Scan(&t.ID, &t.UserID, &t.Name, &t.Prefix, &created, &lastUsed, &revokedAt); err != nil {
		return nil, fmt.Errorf("scan mcp_token: %w", err)
	}
	t.CreatedAt = time.Unix(created, 0)
	if lastUsed.Valid {
		ts := time.Unix(lastUsed.Int64, 0)
		t.LastUsedAt = &ts
	}
	if revokedAt.Valid {
		ts := time.Unix(revokedAt.Int64, 0)
		t.RevokedAt = &ts
	}
	return &t, nil
}

// generateMCPToken は "dmt_" プレフィックス + 32 byte 乱数 base64url の文字列を返す。
func generateMCPToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("rand: %w", err)
	}
	return tokenPlaintextPrefix + base64.RawURLEncoding.EncodeToString(buf), nil
}

// hashMCPToken は平文を SHA-256 hex にエンコードする。
func hashMCPToken(plaintext string) string {
	sum := sha256.Sum256([]byte(plaintext))
	return hex.EncodeToString(sum[:])
}
