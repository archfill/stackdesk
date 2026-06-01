package docker

import "testing"

func TestNormalizeImageRef(t *testing.T) {
	cases := []struct {
		in, want string
	}{
		{"nginx", "nginx:latest"},
		{"nginx:1.27", "nginx:1.27"},
		{"library/nginx", "library/nginx:latest"},
		{"library/nginx:alpine", "library/nginx:alpine"},
		// レジストリのポート付き: tag 無し → :latest を補う
		{"registry.local:5000/foo", "registry.local:5000/foo:latest"},
		// レジストリのポート + tag: 二重補完しない
		{"registry.local:5000/foo:v2", "registry.local:5000/foo:v2"},
		// digest 指定: そのまま
		{"alpine@sha256:deadbeef", "alpine@sha256:deadbeef"},
		{"registry.local:5000/foo@sha256:abcdef", "registry.local:5000/foo@sha256:abcdef"},
	}
	for _, tc := range cases {
		if got := normalizeImageRef(tc.in); got != tc.want {
			t.Errorf("normalizeImageRef(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
