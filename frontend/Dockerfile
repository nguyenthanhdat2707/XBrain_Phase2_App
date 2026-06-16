FROM nginx:1.27-alpine

ARG API_BASE_URL=/api

WORKDIR /usr/share/nginx/html

COPY index.html style.css ./
COPY app.js.tpl ./app.js.tpl

RUN sed "s|{{ api_base_url }}|${API_BASE_URL}|g" app.js.tpl > app.js \
  && rm app.js.tpl

EXPOSE 80
