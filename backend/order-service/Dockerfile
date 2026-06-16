FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY package-lock.json ./
RUN npm ci --omit=dev

COPY server.js ./
COPY data ./data

ENV PORT=3000
EXPOSE 3000

CMD ["node", "server.js"]
