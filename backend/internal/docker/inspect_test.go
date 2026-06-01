package docker

import "testing"

func TestIsSecretEnvKey(t *testing.T) {
	cases := map[string]bool{
		"MCP_TOKEN":         true,
		"API_TOKEN":         true,
		"DB_PASSWORD":       true,
		"DATABASE_PASSWD":   true,
		"PRIVATE_KEY":       true,
		"AWS_SECRET":        true,
		"GITHUB_CREDENTIAL": true,
		"AUTH_HEADER":       true,
		"token":             true, // 大文字小文字非依存
		"PATH":              false,
		"NODE_ENV":          false,
		"PORT":              false,
		"":                  false,
	}
	for key, want := range cases {
		if got := isSecretEnvKey(key); got != want {
			t.Errorf("isSecretEnvKey(%q) = %v, want %v", key, got, want)
		}
	}
}

func TestParseEnv(t *testing.T) {
	got := parseEnv([]string{
		"PATH=/usr/bin",
		"MCP_TOKEN=secret-value",
		"DB_PASSWORD=hunter2",
		"PUBLIC_FLAG=on",
		"BARE_KEY", // = なし
		"EMPTY_TOKEN=",
	})

	want := map[string]string{
		"PATH":        "/usr/bin",
		"MCP_TOKEN":   "[REDACTED]",
		"DB_PASSWORD": "[REDACTED]",
		"PUBLIC_FLAG": "on",
		"BARE_KEY":    "",
		"EMPTY_TOKEN": "", // 値が空なら secret パターンでもマスクしない
	}
	if len(got) != len(want) {
		t.Fatalf("len(got)=%d want=%d, got=%v", len(got), len(want), got)
	}
	for k, w := range want {
		if got[k] != w {
			t.Errorf("env[%q] = %q, want %q", k, got[k], w)
		}
	}
}
