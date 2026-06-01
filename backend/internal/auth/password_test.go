package auth

import (
	"errors"
	"testing"
)

func TestHashAndVerifyPassword(t *testing.T) {
	hash, err := HashPassword("correct-password")
	if err != nil {
		t.Fatalf("HashPassword: %v", err)
	}
	if hash == "" || hash == "correct-password" {
		t.Fatal("hash must not be empty or equal to plaintext")
	}
	if err := VerifyPassword(hash, "correct-password"); err != nil {
		t.Errorf("VerifyPassword (matching) = %v, want nil", err)
	}
	if err := VerifyPassword(hash, "wrong"); !errors.Is(err, ErrInvalidCredentials) {
		t.Errorf("VerifyPassword (wrong) = %v, want ErrInvalidCredentials", err)
	}
}

func TestHashPasswordRejectsEmpty(t *testing.T) {
	if _, err := HashPassword(""); err == nil {
		t.Error("HashPassword should reject empty plaintext")
	}
}

func TestHashRandomized(t *testing.T) {
	// bcrypt は salt を含むので同じ平文でもハッシュは異なる必要がある。
	h1, _ := HashPassword("pw")
	h2, _ := HashPassword("pw")
	if h1 == h2 {
		t.Error("two hashes of same password should differ (salt)")
	}
}
