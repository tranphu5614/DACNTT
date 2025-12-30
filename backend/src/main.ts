import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { join } from 'path';
import mongoose from 'mongoose';
import cors = require('cors');

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { 
    cors: false 
  });

  app.set('trust proxy', 1);

  const allowedOrigins = process.env.FRONTEND_URL 
    ? process.env.FRONTEND_URL.split(',').map(url => url.trim()) 
    : ['http://localhost:3000'];

  app.use(cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (
        !origin || 
        allowedOrigins.includes(origin) || 
        origin.startsWith('http://localhost') || 
        origin.startsWith('http://127.0.0.1')
      ) {
        callback(null, true);
      } else {
        console.error(`❌ CORS Blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  }));

  app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true 
  }));

  const port = process.env.PORT || 3000;

  // 🚀 CẢI TIẾN: Chế độ chờ DB linh hoạt cho Local & Render
  try {
    console.log('⏳ Checking Database connection status...');
    
    if (mongoose.connection.readyState !== 1) {
      // Đợi tối đa 5 giây cho DB. Nếu quá 5 giây (thường gặp ở local docker), 
      // app vẫn sẽ khởi động để không bị crash vòng lặp.
      await Promise.race([
        new Promise((resolve) => {
          mongoose.connection.once('open', () => {
            console.log('✅ MongoDB connected successfully via "once open"');
            resolve(true);
          });
        }),
        new Promise((resolve) => setTimeout(() => {
          console.log('⚠️ DB Connection is taking time... Starting server anyway (Mongoose will auto-retry).');
          resolve(true);
        }, 5000)) 
      ]);
    } else {
      console.log('✅ MongoDB is already connected.');
    }

    await app.listen(port, '0.0.0.0');
    
    console.log(`-----------------------------------------------`);
    console.log(`🚀 Server is running on: http://0.0.0.0:${port}`);
    console.log(`🌍 Allowed Origins: ${allowedOrigins.join(', ')}`);
    console.log(`-----------------------------------------------`);
    
  } catch (error: any) {
    console.error('❌ Failed to start server:', error?.message || error);
    // Chỉ đóng app hoàn toàn nếu đang ở môi trường Production (Render) và lỗi quá nặng
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }
}

bootstrap();