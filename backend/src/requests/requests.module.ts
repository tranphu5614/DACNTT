// backend/src/requests/requests.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { Request as RequestEntity, RequestSchema } from './schemas/request.schema';
import { AiModule } from '../ai/ai.module'; // [NEW]

@Module({
  imports: [
    MongooseModule.forFeature([{ name: RequestEntity.name, schema: RequestSchema }]),
    AiModule, // [NEW]
  ],
  controllers: [RequestsController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}