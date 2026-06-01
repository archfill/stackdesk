package docker

import (
	"encoding/json"
	"fmt"
	"strings"

	"docker-manager/internal/models"

	"github.com/docker/docker/api/types/image"
)

// CheckImageUpdates はイメージの更新有無を manifest digest 比較で判定する。
//
// ローカルでビルドされたイメージ（RepoDigests が空）はスキップする。
// プライベートレジストリで認証エラーになった場合も skip して次のサービスへ進む
// （MCP 経由で部分的にでも結果を返したいため）。
func (c *Client) CheckImageUpdates(projectName string) ([]models.ImageUpdate, error) {
	containers, err := c.getProjectContainers(projectName, "")
	if err != nil {
		return nil, err
	}
	if len(containers) == 0 {
		return nil, fmt.Errorf("no containers found for project %q", projectName)
	}

	updates := []models.ImageUpdate{}

	for _, cont := range containers {
		imageRef := normalizeImageRef(cont.Image)

		localDigest, hasLocal, err := c.localImageDigest(imageRef)
		if err != nil || !hasLocal {
			// ローカルにイメージが見つからない or digest 未付与 → スキップ。
			continue
		}

		remote, err := c.cli.DistributionInspect(c.ctx, imageRef, "")
		if err != nil {
			// プライベートレジストリ等で取得不可 → スキップ。
			continue
		}
		remoteDigest := string(remote.Descriptor.Digest)
		if remoteDigest == "" {
			continue
		}

		updates = append(updates, models.ImageUpdate{
			ServiceName:    cont.Labels["com.docker.compose.service"],
			CurrentImage:   imageRef,
			CurrentDigest:  localDigest,
			LatestDigest:   remoteDigest,
			UpdateRequired: localDigest != remoteDigest,
		})
	}

	return updates, nil
}

// normalizeImageRef は tag が省略されている場合 :latest を補う。
func normalizeImageRef(imageName string) string {
	// digest 指定 (image@sha256:...) はそのまま返す。
	if strings.Contains(imageName, "@") {
		return imageName
	}
	// repo:tag をパース。:latest がない場合に補完。
	// レジストリのポートを含む `host:5000/foo` を tag と誤認しないよう、
	// 最後のスラッシュ以降に `:` があるかで判断する。
	lastSlash := strings.LastIndex(imageName, "/")
	tail := imageName
	if lastSlash >= 0 {
		tail = imageName[lastSlash+1:]
	}
	if !strings.Contains(tail, ":") {
		return imageName + ":latest"
	}
	return imageName
}

// localImageDigest はローカルにある imageRef の digest を返す。
// 二番目の戻り値はローカルに存在し、かつ digest が取得できたかどうか。
func (c *Client) localImageDigest(imageRef string) (string, bool, error) {
	inspected, err := c.cli.ImageInspect(c.ctx, imageRef)
	if err != nil {
		return "", false, err
	}
	// RepoDigests は ["foo/bar@sha256:abcd..."] 形式。レジストリと一致する最初の digest を返す。
	for _, rd := range inspected.RepoDigests {
		at := strings.IndexByte(rd, '@')
		if at < 0 {
			continue
		}
		return rd[at+1:], true, nil
	}
	return "", false, nil
}

// PullImages は指定されたプロジェクトのイメージを pull する。
func (c *Client) PullImages(projectName string) error {
	containers, err := c.getProjectContainers(projectName, "")
	if err != nil {
		return err
	}
	if len(containers) == 0 {
		return fmt.Errorf("no containers found for project %q", projectName)
	}

	for _, cont := range containers {
		imageName := cont.Image

		out, err := c.cli.ImagePull(c.ctx, imageName, image.PullOptions{})
		if err != nil {
			return fmt.Errorf("failed to pull image %s: %w", imageName, err)
		}

		// プル結果のストリームを読み切る（プログレスメッセージを drain）。
		dec := json.NewDecoder(out)
		var msg map[string]any
		for dec.More() {
			if err := dec.Decode(&msg); err != nil {
				break
			}
		}
		_ = out.Close()
	}

	return nil
}
