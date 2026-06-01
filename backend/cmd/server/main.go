package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"docker-manager/internal/api"
	"docker-manager/internal/auth"
	"docker-manager/internal/docker"
	mcpserver "docker-manager/internal/mcp"
	"docker-manager/internal/store"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 永続化 (SQLite) の初期化
	dbPath := os.Getenv("DB_PATH")
	if dbPath == "" {
		dbPath = "./data/docker-manager.db"
	}
	if err := os.MkdirAll(filepath.Dir(dbPath), 0o755); err != nil {
		log.Fatalf("Failed to create data dir: %v", err)
	}
	st, err := store.Open(dbPath)
	if err != nil {
		log.Fatalf("Failed to open store: %v", err)
	}
	defer st.Close()

	// Docker クライアントの初期化
	dockerClient, err := docker.NewClient()
	if err != nil {
		log.Fatalf("Failed to create Docker client: %v", err)
	}
	defer dockerClient.Close()

	// Gin ルーターの設定
	r := gin.Default()

	// CORS 設定。cookie ベース認証のため AllowOrigins と AllowCredentials を併用する。
	allowedOrigins := parseCSV(os.Getenv("CORS_ALLOWED_ORIGINS"))
	if len(allowedOrigins) == 0 {
		// dev デフォルト: Vite と nginx 本番ポート両方を許容
		allowedOrigins = []string{"http://localhost:5173", "http://localhost:3000"}
	}
	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// 認証マネージャ
	cookieSecure := strings.EqualFold(os.Getenv("COOKIE_SECURE"), "true")
	authMgr := auth.NewManager(st, auth.Config{
		Secure:   cookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
	authHandler := auth.NewHandler(st, authMgr)
	authHandler.RegisterRoutes(r)

	// 既存 API ルート（session 認証必須）+ admin 専用ルート
	api.RegisterRoutes(r, dockerClient, st, authMgr.RequireUser(), authMgr.RequireAdmin())

	// MCP サーバを /mcp で公開。トークンは DB (mcp_tokens) で検証する。
	mcpHandler := mcpserver.New(dockerClient, st)
	r.Any("/mcp", gin.WrapH(mcpHandler))
	r.Any("/mcp/*path", gin.WrapH(mcpHandler))

	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s (db=%s)", port, dbPath)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

func parseCSV(s string) []string {
	if s == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	out := parts[:0]
	for _, p := range parts {
		if v := strings.TrimSpace(p); v != "" {
			out = append(out, v)
		}
	}
	return out
}
