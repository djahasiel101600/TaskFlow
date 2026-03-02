# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Build with empty API URL so the app uses relative /api and /ws (nginx will proxy)
ENV VITE_API_URL=
RUN npm run build

# Serve stage
FROM nginx:alpine

# Remove default config and use ours
RUN rm -rf /usr/share/nginx/html/*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
