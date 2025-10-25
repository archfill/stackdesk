# ビルドステージ
FROM node:24-alpine AS builder

WORKDIR /app

# 依存関係ファイルをコピー
COPY package*.json ./
RUN npm ci

# ソースコードをコピー
COPY . .

# ビルド
RUN npm run build

# 本番ステージ（Nginx で静的ファイルを配信）
FROM nginx:alpine

# ビルドステージから生成物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 設定ファイルをコピー（SPA用）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
