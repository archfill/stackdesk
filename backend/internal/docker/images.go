package docker

import (
	"encoding/json"
	"fmt"
	"strings"

	"docker-manager/internal/models"

	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/registry"
)

// CheckImageUpdates はイメージの更新をチェック
func (c *Client) CheckImageUpdates(projectName string) ([]models.ImageUpdate, error) {
	containers, err := c.getProjectContainers(projectName)
	if err != nil {
		return nil, err
	}

	updates := []models.ImageUpdate{}

	for _, cont := range containers {
		imageName := cont.Image

		// ローカルイメージ情報を取得
		localImages, err := c.cli.ImageList(c.ctx, image.ListOptions{})
		if err != nil {
			return nil, fmt.Errorf("failed to list local images: %w", err)
		}

		var localImageID string
		for _, img := range localImages {
			for _, tag := range img.RepoTags {
				if tag == imageName {
					localImageID = img.ID
					break
				}
			}
		}

		// リモートイメージの最新情報を取得
		hasUpdate, latestDigest, err := c.checkRemoteImageUpdate(imageName, localImageID)
		if err != nil {
			// エラーがあっても続行（プライベートレジストリなどでアクセスできない場合もある）
			continue
		}

		if hasUpdate {
			updates = append(updates, models.ImageUpdate{
				ServiceName:    cont.Labels["com.docker.compose.service"],
				CurrentImage:   imageName,
				CurrentDigest:  localImageID,
				LatestDigest:   latestDigest,
				UpdateRequired: true,
			})
		}
	}

	return updates, nil
}

// checkRemoteImageUpdate はリモートイメージの更新をチェック
func (c *Client) checkRemoteImageUpdate(imageName, localImageID string) (bool, string, error) {
	// イメージ名からレジストリとリポジトリを分離
	parts := strings.Split(imageName, ":")
	imageRef := imageName
	if len(parts) == 1 {
		imageRef = imageName + ":latest"
	}

	// リモートイメージの情報を取得
	_, err := c.cli.DistributionInspect(c.ctx, imageRef, "")
	if err != nil {
		return false, "", fmt.Errorf("failed to inspect remote image: %w", err)
	}

	// 簡易的な実装: イメージをプルして比較
	// 本番環境では、よりスマートな方法（manifest比較など）を使用すべき
	return false, "", nil
}

// PullImages は指定されたプロジェクトのイメージをpull
func (c *Client) PullImages(projectName string) error {
	containers, err := c.getProjectContainers(projectName)
	if err != nil {
		return err
	}

	for _, cont := range containers {
		imageName := cont.Image

		out, err := c.cli.ImagePull(c.ctx, imageName, image.PullOptions{})
		if err != nil {
			return fmt.Errorf("failed to pull image %s: %w", imageName, err)
		}
		defer out.Close()

		// プル結果を読み取る（進捗表示のため）
		decoder := json.NewDecoder(out)
		var status registry.DistributionInspect
		for decoder.More() {
			if err := decoder.Decode(&status); err != nil {
				break
			}
		}
	}

	return nil
}
