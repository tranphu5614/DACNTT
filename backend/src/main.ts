import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cors from 'cors';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });

  app.use(cors({
    origin: [
      'http://localhost',              // Cho phép Frontend chạy port 80 (Docker)
      /^http:\/\/localhost:\d+$/,      // Cho phép localhost có port bất kỳ (Dev mode)
      /^http:\/\/127\.0\.0\.1:\d+$/    // Cho phép IP loopback
    ],
    credentials: true,
    methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  app.use('/uploads', express.static(join(process.cwd(), 'uploads'))); // 👈 serve file đính kèm

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API is running on http://localhost:${port}`);
}
bootstrap();
