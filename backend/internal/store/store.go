// Package store はアプリケーションの永続化層（SQLite）を提供する。
package store

import (
	"database/sql"
	"fmt"

	_ "modernc.org/sqlite" // pure-Go SQLite ドライバ
)

// Store は DB 接続とリポジトリ群をまとめる。
type Store struct {
	db       *sql.DB
	Users    *UserRepo
	Sessions *SessionRepo
}

// Open は SQLite を開いてマイグレーションを実行する。
// path は SQLite ファイルパス。":memory:" でインメモリ DB。
func Open(path string) (*Store, error) {
	dsn := fmt.Sprintf("file:%s?_pragma=journal_mode(WAL)&_pragma=foreign_keys(ON)&_pragma=busy_timeout(5000)", path)
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("ping sqlite: %w", err)
	}

	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}

	return &Store{
		db:       db,
		Users:    &UserRepo{db: db},
		Sessions: NewSessionRepo(db),
	}, nil
}

// Close は DB 接続を閉じる。
func (s *Store) Close() error {
	return s.db.Close()
}

// DB は内部の *sql.DB を返す（テスト・拡張用）。
func (s *Store) DB() *sql.DB {
	return s.db
}
