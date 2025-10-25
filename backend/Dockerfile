# ビルドステージ
FROM golang:1.25-alpine AS builder

WORKDIR /app

# 依存関係ファイルをコピー
COPY go.mod go.sum ./
RUN go mod download

# ソースコードをコピー
COPY . .

# バイナリをビルド
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/server

# 実行ステージ
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# ビルドステージからバイナリをコピー
COPY --from=builder /app/server .

# ポート公開
EXPOSE 8080

# サーバー起動
CMD ["./server"]
