# --- Build stage ---
FROM node:14-alpine as builder
WORKDIR /app

COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM nginx:1.19-alpine

# Clear any old files
RUN rm -rf /usr/share/nginx/html/*

# Copy new build
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom nginx config
COPY conf/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
