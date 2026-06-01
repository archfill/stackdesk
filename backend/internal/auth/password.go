// Package auth はユーザー認証（ログイン・セッション）を提供する。
package auth

import (
	"errors"
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

// ErrInvalidCredentials は username/password の組が一致しないときに返す。
var ErrInvalidCredentials = errors.New("invalid credentials")

// HashPassword は平文パスワードを bcrypt でハッシュ化する。
func HashPassword(plaintext string) (string, error) {
	if plaintext == "" {
		return "", errors.New("password must not be empty")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("bcrypt: %w", err)
	}
	return string(hash), nil
}

// VerifyPassword は平文と保存済みハッシュを照合する。
// 一致しないなら ErrInvalidCredentials を返す（一致しない理由は呼び出し側で区別しない）。
func VerifyPassword(hash, plaintext string) error {
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(plaintext)); err != nil {
		return ErrInvalidCredentials
	}
	return nil
}
