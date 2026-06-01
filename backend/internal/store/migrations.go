package store

import (
	"database/sql"
	"fmt"
)

// migrations は順番にスキーマを進める SQL のリスト。
// 末尾追加のみ可。既存要素を変更してはならない。
var migrations = []string{
	`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    INTEGER NOT NULL,
  is_active     INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS sessions (
  id_hash    TEXT    PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id    ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
`,
}

// migrate は schema_version を見て未適用のマイグレーションを順に実行する。
func migrate(db *sql.DB) error {
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_version (version INTEGER NOT NULL)`); err != nil {
		return fmt.Errorf("create schema_version: %w", err)
	}

	var current int
	row := db.QueryRow(`SELECT COALESCE(MAX(version), 0) FROM schema_version`)
	if err := row.Scan(&current); err != nil {
		return fmt.Errorf("read schema_version: %w", err)
	}

	for i := current; i < len(migrations); i++ {
		next := i + 1
		tx, err := db.Begin()
		if err != nil {
			return fmt.Errorf("begin migration %d: %w", next, err)
		}
		if _, err := tx.Exec(migrations[i]); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("apply migration %d: %w", next, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_version (version) VALUES (?)`, next); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("record migration %d: %w", next, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("commit migration %d: %w", next, err)
		}
	}
	return nil
}
