# --- Stage 1: Build ---
FROM node:20-alpine as builder

# Nhận biến từ Render truyền vào lúc build (Build-time)
ARG VITE_API_URL

# Gán vào ENV để câu lệnh npm run build có thể đọc được
ENV VITE_API_URL=$VITE_API_URL

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Vite sẽ tìm thấy ENV VITE_API_URL và nhúng vào file dist
RUN npm run build

# --- Stage 2: Serve bằng Nginx ---
FROM nginx:alpine

# Copy cấu hình template để xử lý biến BACKEND_URL (Runtime)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy file tĩnh đã được nhúng URL API từ stage builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
# Không dùng CMD để mặc định Nginx tự chạy script envsubst