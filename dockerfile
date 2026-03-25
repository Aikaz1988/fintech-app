# syntax=docker/dockerfile:1.7

# Stage 1: Build the Vite app
FROM node:22-alpine AS builder
WORKDIR /app

# Обновляем системные пакеты до последних security patch-версий.
RUN apk upgrade --no-cache

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ARG VITE_BASE_PATH=/

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=$VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
ENV VITE_BASE_PATH=$VITE_BASE_PATH

RUN npm run build

# Stage 2: Serve static assets with Nginx
FROM nginxinc/nginx-unprivileged:stable-alpine

# Security patching for Alpine base.
RUN apk upgrade --no-cache

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]