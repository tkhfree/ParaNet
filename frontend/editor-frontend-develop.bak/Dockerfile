FROM nginx:latest
ADD ./dist/ /etc/nginx/html/
COPY nginx.conf /etc/nginx/nginx.conf
# ARG NGINX_PATH
# COPY config/$NGINX_PATH/nginx.conf /etc/nginx/nginx.conf