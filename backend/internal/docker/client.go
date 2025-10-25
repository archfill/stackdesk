package docker

import (
	"context"

	"github.com/docker/docker/client"
)

// Client は Docker API クライアントのラッパー
type Client struct {
	cli *client.Client
	ctx context.Context
}

// NewClient は新しい Docker クライアントを作成
func NewClient() (*Client, error) {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		return nil, err
	}

	return &Client{
		cli: cli,
		ctx: context.Background(),
	}, nil
}

// Close は Docker クライアントをクローズ
func (c *Client) Close() error {
	return c.cli.Close()
}

// GetClient は内部の Docker クライアントを返す
func (c *Client) GetClient() *client.Client {
	return c.cli
}

// GetContext はコンテキストを返す
func (c *Client) GetContext() context.Context {
	return c.ctx
}
