# --- Build stage ---
FROM node:14-alpine as builder
WORKDIR /app

COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.19-alpine

# Copy built React app
COPY --from=builder /app/build /usr/share/nginx/html
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
