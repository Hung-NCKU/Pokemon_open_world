# 遊戲網頁：先用 Vite 打包（npm run build → dist/），再由 nginx 提供（http://localhost:8080/）
# docker compose up web
# 本機有 assets/gen3（python tools/build_assets.py 產生）時會一起放進映像檔；沒有時遊戲退回內建的畫面
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
