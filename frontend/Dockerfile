# --- Stage 1: Build ---
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# --- Stage 2: Serve bằng Nginx ---
FROM nginx:alpine

# 1. THAY ĐỔI: Copy vào thư mục templates thay vì conf.d trực tiếp
# Nginx Docker image sẽ tự động dùng envsubst để thay thế biến môi trường
# sau đó mới xuất file thực tế vào /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copy file build từ stage trước
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# 2. THAY ĐỔI: Xóa dòng CMD cũ
# Image nginx:alpine mặc định đã có script chạy envsubst và khởi động nginx rồi.
# Nếu bạn ghi đè CMD như cũ, script envsubst sẽ không được chạy.