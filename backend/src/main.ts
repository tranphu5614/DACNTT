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
// Import NestExpressApplication để sử dụng được hàm .set() của Express
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  // 1. Chỉnh sửa: Sử dụng NestExpressApplication để truy cập cấu hình sâu của Express
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });

  // 2. QUAN TRỌNG: Thiết lập 'trust proxy' để sửa lỗi express-rate-limit trên Render
  // Số 1 đại diện cho việc tin tưởng proxy đầu tiên (Render Load Balancer)
  app.set('trust proxy', 1);

  // 3. XỬ LÝ DYNAMIC CORS (Giữ nguyên logic của bạn)
  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
    : ['http://localhost:3000'];

  app.use(cors({
    origin: (origin, callback) => {
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

  // 4. STATIC FILES
  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  // 5. GLOBAL PIPES
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true 
  }));

  // 6. LẮNG NGHE PORT
  const port = process.env.PORT || 3000;
  
  await app.listen(port, '0.0.0.0');
  
  console.log(`-----------------------------------------------`);
  console.log(`🚀 Server is running on: http://0.0.0.0:${port}`);
  console.log(`🌍 Allowed Origins: ${allowedOrigins.join(', ')}`);
  console.log(`-----------------------------------------------`);
}

bootstrap();