package docker

import (
	"bufio"
	"fmt"
	"io"
	"strconv"
	"strings"

	"docker-manager/internal/models"

	"github.com/docker/docker/api/types/container"
)

// LogsOptions は GetLogs の引数オプション。
type LogsOptions struct {
	Service string // 空文字なら全 service
	Tail    int    // 0 以下は default(200) 扱い。
	Since   string // "10m", "2025-06-01T00:00:00Z" など Docker API が受け付ける形式。
}

const (
	defaultLogTail = 200
	maxLogTail     = 2000
)

// GetLogs は project のログを service 横断で取得しマージして返す。
func (c *Client) GetLogs(projectName string, opts LogsOptions) ([]models.LogLine, error) {
	containers, err := c.getProjectContainers(projectName, opts.Service)
	if err != nil {
		return nil, err
	}
	if len(containers) == 0 {
		return nil, fmt.Errorf("no containers found for project %q service %q", projectName, opts.Service)
	}

	tail := opts.Tail
	if tail <= 0 {
		tail = defaultLogTail
	}
	if tail > maxLogTail {
		tail = maxLogTail
	}

	all := make([]models.LogLine, 0, tail*len(containers))
	for _, cont := range containers {
		serviceName := cont.Labels["com.docker.compose.service"]

		reader, err := c.cli.ContainerLogs(c.ctx, cont.ID, container.LogsOptions{
			ShowStdout: true,
			ShowStderr: true,
			Tail:       strconv.Itoa(tail),
			Since:      opts.Since,
		})
		if err != nil {
			return nil, fmt.Errorf("failed to fetch logs for %s: %w", cont.ID, err)
		}

		lines, err := readMultiplexedLogs(reader, serviceName, cont.HostConfig.NetworkMode == "host")
		_ = reader.Close()
		if err != nil {
			return nil, fmt.Errorf("failed to parse logs for %s: %w", cont.ID, err)
		}
		all = append(all, lines...)
	}
	return all, nil
}

// readMultiplexedLogs は Docker のログストリームを解析して LogLine スライスに変換する。
//
// Docker daemon は TTY 無効コンテナの場合、各フレームの先頭 8 bytes に
// stream type/size のヘッダを付けて多重化する。tty=true の場合は素のテキスト。
// 一般的な compose サービスはほぼ tty=false。tty=true 検出が必要な場合は
// ContainerInspect の Config.Tty を見るのが正攻法だが、ここでは header を覗いて
// 安全に剥がせれば剥がす、というベストエフォート戦略を取る。
func readMultiplexedLogs(r io.Reader, service string, _ bool) ([]models.LogLine, error) {
	br := bufio.NewReader(r)
	var lines []models.LogLine

	for {
		header, err := br.Peek(8)
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, err
		}

		// 先頭バイトが 0/1/2 (stdin/stdout/stderr) なら multiplexed として処理。
		// それ以外は素のテキストとして 1 行ずつ読む。
		if header[0] <= 2 && header[1] == 0 && header[2] == 0 && header[3] == 0 {
			stream := streamName(header[0])
			length := int(uint32(header[4])<<24 | uint32(header[5])<<16 | uint32(header[6])<<8 | uint32(header[7]))
			if _, err := br.Discard(8); err != nil {
				return nil, err
			}
			buf := make([]byte, length)
			if _, err := io.ReadFull(br, buf); err != nil {
				return nil, err
			}
			for _, line := range strings.Split(strings.TrimRight(string(buf), "\n"), "\n") {
				if line == "" {
					continue
				}
				lines = append(lines, models.LogLine{Service: service, Stream: stream, Message: line})
			}
		} else {
			line, err := br.ReadString('\n')
			if err != nil && err != io.EOF {
				return nil, err
			}
			line = strings.TrimRight(line, "\n")
			if line != "" {
				lines = append(lines, models.LogLine{Service: service, Stream: "stdout", Message: line})
			}
			if err == io.EOF {
				break
			}
		}
	}
	return lines, nil
}

func streamName(b byte) string {
	switch b {
	case 1:
		return "stdout"
	case 2:
		return "stderr"
	default:
		return "stdin"
	}
}
