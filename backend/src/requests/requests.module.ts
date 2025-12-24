import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer'; // [MỚI]
import { extname } from 'path';      // [MỚI]
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { Request, RequestSchema } from './schemas/request.schema';
import { AiModule } from '../ai/ai.module';
import { UsersModule } from '../users/users.module';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Request.name, schema: RequestSchema }]),
    
    // [CẬP NHẬT] Cấu hình lưu file giữ nguyên đuôi mở rộng (.jpg, .png...)
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // Tạo tên file ngẫu nhiên để tránh trùng
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          // Lấy đuôi file gốc (VD: .jpg)
          const ext = extname(file.originalname);
          // Lưu thành: 123456789-987654321.jpg
          cb(null, `${uniqueSuffix}${ext}`);
        },
      }),
    }),

    AiModule,
    UsersModule,
    CatalogModule
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}