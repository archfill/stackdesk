package docker

import (
	"bytes"
	"encoding/binary"
	"strings"
	"testing"
)

// makeStdcopyFrame は Docker stdcopy 形式のフレームを 1 つ組み立てる。
// stream: 1=stdout, 2=stderr
func makeStdcopyFrame(stream byte, payload string) []byte {
	header := make([]byte, 8)
	header[0] = stream
	binary.BigEndian.PutUint32(header[4:], uint32(len(payload)))
	return append(header, []byte(payload)...)
}

func TestReadMultiplexedLogs_Stdcopy(t *testing.T) {
	var buf bytes.Buffer
	buf.Write(makeStdcopyFrame(1, "hello\nworld\n"))
	buf.Write(makeStdcopyFrame(2, "warn-msg\n"))
	buf.Write(makeStdcopyFrame(1, "tail\n"))

	lines, err := readMultiplexedLogs(&buf, "svc", false)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	want := []struct {
		stream, message string
	}{
		{"stdout", "hello"},
		{"stdout", "world"},
		{"stderr", "warn-msg"},
		{"stdout", "tail"},
	}
	if len(lines) != len(want) {
		t.Fatalf("got %d lines, want %d: %#v", len(lines), len(want), lines)
	}
	for i, w := range want {
		if lines[i].Service != "svc" {
			t.Errorf("line[%d] service=%q want svc", i, lines[i].Service)
		}
		if lines[i].Stream != w.stream {
			t.Errorf("line[%d] stream=%q want %q", i, lines[i].Stream, w.stream)
		}
		if lines[i].Message != w.message {
			t.Errorf("line[%d] message=%q want %q", i, lines[i].Message, w.message)
		}
	}
}

func TestReadMultiplexedLogs_PlainText(t *testing.T) {
	// stdcopy header を持たない素のテキスト（tty モードのコンテナを想定）。
	// 先頭バイトが 0/1/2 以外なら plain として 1 行ずつ読み取る。
	input := strings.NewReader("alpha\nbeta\n")
	lines, err := readMultiplexedLogs(input, "svc", true)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(lines) != 2 || lines[0].Message != "alpha" || lines[1].Message != "beta" {
		t.Fatalf("unexpected lines: %#v", lines)
	}
	for _, l := range lines {
		if l.Stream != "stdout" {
			t.Errorf("plain text should default to stdout, got %q", l.Stream)
		}
	}
}

func TestReadMultiplexedLogs_Empty(t *testing.T) {
	lines, err := readMultiplexedLogs(bytes.NewReader(nil), "svc", false)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if len(lines) != 0 {
		t.Fatalf("expected 0 lines, got %d", len(lines))
	}
}
