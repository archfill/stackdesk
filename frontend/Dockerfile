# ビルドステージ
FROM node:26-alpine AS builder

# corepack は node:26-alpine では同梱されなくなったため npm から導入
RUN npm install -g corepack && corepack enable

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ソースコードをコピー
COPY . .

# Vite の VITE_API_URL を build-arg で差し込めるようにする
# 未指定なら src/api/client.ts の fallback (http://localhost:8080) が効く
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL

# ビルド
RUN pnpm run build

# 本番ステージ（Nginx で静的ファイルを配信）
FROM nginx:alpine

# ビルドステージから生成物をコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# Nginx 設定ファイルをコピー（SPA用）
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
