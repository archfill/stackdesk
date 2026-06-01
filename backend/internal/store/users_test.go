package store

import (
	"errors"
	"testing"
)

func openTestStore(t *testing.T) *Store {
	t.Helper()
	s, err := Open(":memory:")
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	t.Cleanup(func() { _ = s.Close() })
	return s
}

func TestUserCRUD(t *testing.T) {
	s := openTestStore(t)

	if n, err := s.Users.Count(); err != nil || n != 0 {
		t.Fatalf("Count() = %d, %v; want 0, nil", n, err)
	}

	u, err := s.Users.CreateAdmin("admin", "hash1")
	if err != nil {
		t.Fatalf("CreateAdmin: %v", err)
	}
	if u.Role != RoleAdmin {
		t.Errorf("role = %q, want %q", u.Role, RoleAdmin)
	}
	if !u.IsActive {
		t.Error("new user must be active")
	}

	if _, err := s.Users.Create("admin", "hash-dup", RoleMember); !errors.Is(err, ErrUsernameTaken) {
		t.Errorf("duplicate username err = %v, want ErrUsernameTaken", err)
	}

	if _, err := s.Users.Create("alice", "hash2", RoleMember); err != nil {
		t.Fatalf("Create member: %v", err)
	}

	users, err := s.Users.List()
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(users) != 2 {
		t.Fatalf("List len = %d, want 2", len(users))
	}
	if users[0].Username != "admin" || users[1].Username != "alice" {
		t.Errorf("List ordering = %v", []string{users[0].Username, users[1].Username})
	}
}

func TestUserGet(t *testing.T) {
	s := openTestStore(t)
	created, err := s.Users.CreateAdmin("admin", "hash1")
	if err != nil {
		t.Fatal(err)
	}

	t.Run("GetByUsername returns hash", func(t *testing.T) {
		u, hash, err := s.Users.GetByUsername("admin")
		if err != nil {
			t.Fatal(err)
		}
		if u.ID != created.ID {
			t.Errorf("ID = %d, want %d", u.ID, created.ID)
		}
		if hash != "hash1" {
			t.Errorf("hash = %q, want hash1", hash)
		}
	})

	t.Run("GetByUsername unknown", func(t *testing.T) {
		_, _, err := s.Users.GetByUsername("nope")
		if !errors.Is(err, ErrUserNotFound) {
			t.Errorf("err = %v, want ErrUserNotFound", err)
		}
	})

	t.Run("GetByID", func(t *testing.T) {
		u, err := s.Users.GetByID(created.ID)
		if err != nil {
			t.Fatal(err)
		}
		if u.Username != "admin" {
			t.Errorf("username = %q", u.Username)
		}
	})

	t.Run("GetByID unknown", func(t *testing.T) {
		_, err := s.Users.GetByID(999)
		if !errors.Is(err, ErrUserNotFound) {
			t.Errorf("err = %v, want ErrUserNotFound", err)
		}
	})
}

func TestUpdateRoleAndCountAdmins(t *testing.T) {
	s := openTestStore(t)
	admin, _ := s.Users.CreateAdmin("admin", "hash1")
	alice, _ := s.Users.Create("alice", "hash2", RoleMember)

	if n, err := s.Users.CountAdmins(); err != nil || n != 1 {
		t.Fatalf("CountAdmins initial = %d, %v; want 1, nil", n, err)
	}

	if err := s.Users.UpdateRole(alice.ID, RoleAdmin); err != nil {
		t.Fatalf("UpdateRole: %v", err)
	}
	if n, _ := s.Users.CountAdmins(); n != 2 {
		t.Errorf("CountAdmins after promote = %d, want 2", n)
	}

	if err := s.Users.UpdateRole(admin.ID, RoleMember); err != nil {
		t.Fatalf("UpdateRole demote: %v", err)
	}
	if n, _ := s.Users.CountAdmins(); n != 1 {
		t.Errorf("CountAdmins after demote = %d, want 1", n)
	}

	if err := s.Users.UpdateRole(999, RoleAdmin); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("UpdateRole unknown id err = %v, want ErrUserNotFound", err)
	}

	if err := s.Users.UpdateRole(alice.ID, Role("invalid")); err == nil {
		t.Error("UpdateRole with invalid role should fail")
	}
}

func TestDeleteUser(t *testing.T) {
	s := openTestStore(t)
	admin, _ := s.Users.CreateAdmin("admin", "hash1")

	if err := s.Users.Delete(admin.ID); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := s.Users.GetByID(admin.ID); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("after Delete, GetByID err = %v, want ErrUserNotFound", err)
	}
	if err := s.Users.Delete(admin.ID); !errors.Is(err, ErrUserNotFound) {
		t.Errorf("double Delete err = %v, want ErrUserNotFound", err)
	}
}

func TestDeleteCascadesSessionsAndTokens(t *testing.T) {
	s := openTestStore(t)
	u, _ := s.Users.CreateAdmin("admin", "hash1")

	sessID, _, err := s.Sessions.Create(u.ID, 60*60*1_000_000_000, "ua")
	if err != nil {
		t.Fatal(err)
	}
	if _, _, err := s.MCPTokens.Create(u.ID, "t1"); err != nil {
		t.Fatal(err)
	}

	if err := s.Users.Delete(u.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Sessions.Get(sessID); !errors.Is(err, ErrSessionNotFound) {
		t.Errorf("session should be cascaded; err = %v", err)
	}
	tokens, err := s.MCPTokens.ListByUser(u.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 0 {
		t.Errorf("tokens should be cascaded; got %d", len(tokens))
	}
}
