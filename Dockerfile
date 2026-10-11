# 遊戲網頁：nginx 提供靜態檔案（http://localhost:8080/）
# docker compose up web
# 本機有 assets/gen3（python tools/build_assets.py 產生）時會一起放進映像檔；沒有時遊戲退回內建的畫面
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY . /usr/share/nginx/html
EXPOSE 80
