package main

import (
	"log"
	"os"

	"docker-manager/internal/api"
	"docker-manager/internal/docker"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// Docker クライアントの初期化
	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Fatalf("Failed to create Docker client: %v", err)
	}
	defer dockerClient.Close()

	// Gin ルーターの設定
	r := gin.Default()

	// CORS 設定（開発環境：全てのオリジンを許可）
	r.Use(cors.New(cors.Config{
		AllowAllOrigins:  true, // 開発環境なので全て許可
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false, // AllowAllOrigins使用時はfalseが必要
	}))

	// API ルートの登録
	api.RegisterRoutes(r, dockerClient)

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
