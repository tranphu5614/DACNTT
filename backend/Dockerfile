# backend/Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

# Cài đặt dependencies (bỏ qua bước rebuild onnxruntime nặng nề)
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/main.js"]