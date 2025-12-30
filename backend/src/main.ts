import 'reflect-metadata';
import * as dotenv from 'dotenv';
// Load biến môi trường từ file .env
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from 'cors';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  // Khởi tạo NestJS app với cấu hình cors: false để ta tự cấu hình bằng middleware
  const app = await NestFactory.create(AppModule, { cors: false });

  // 1. XỬ LÝ DYNAMIC CORS
  // Lấy danh sách URL từ .env (phân tách bằng dấu phẩy)
  // Ví dụ: FRONTEND_URL=https://app.com,http://localhost:5173
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
    : ['http://localhost:3000'];

  app.use(cors({
    origin: (origin, callback) => {
      // Cho phép nếu: 
      // - Không có origin (như Postman, Mobile app)
      // - Origin nằm trong danh sách whitelist
      // - Đang chạy ở localhost (dành cho phát triển)
      if (
        !origin || 
        allowedOrigins.includes(origin) || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('http://127.0.0.1')
      ) {
        callback(null, true);
      } else {
        console.error(`CORS Blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }));

  // 2. STATIC FILES (Phục vụ file đính kèm/uploads)
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // 3. GLOBAL PIPES (Validation dữ liệu đầu vào)
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true 
  }));

  // 4. LẮNG NGHE PORT
  const port = process.env.PORT || 3000;
  
  // Quan trọng: Trên Render phải có '0.0.0.0' để chấp nhận kết nối từ môi trường bên ngoài
  await app.listen(port, '0.0.0.0');
  
  console.log(`-----------------------------------------------`);
  console.log(`🚀 Server is running on: http://0.0.0.0:${port}`);
  console.log(`🌍 Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`-----------------------------------------------`);
}

bootstrap();