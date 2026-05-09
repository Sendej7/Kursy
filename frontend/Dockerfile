# ---------- builder ----------
FROM node:22-alpine AS builder
WORKDIR /app

# Cache npm install na package*.json
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# VITE_* env musi być na build-time — pozwalamy je przekazać przez --build-arg
ARG VITE_API_BASE
ARG VITE_GOOGLE_CLIENT_ID
ARG VITE_GITHUB_CLIENT_ID
ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID
ENV VITE_GITHUB_CLIENT_ID=$VITE_GITHUB_CLIENT_ID
RUN npm run build

# ---------- runtime ----------
FROM nginx:1.27-alpine AS runtime

# SPA routing — wszystko poza istniejącymi plikami → /index.html
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
