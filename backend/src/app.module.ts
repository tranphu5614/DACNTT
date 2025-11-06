import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RequestsModule } from './requests/requests.module';
import { CatalogModule } from './catalog/catalog.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/reqsys'),
    UsersModule,
    AuthModule,
    RequestsModule,
    CatalogModule,
    AiModule,
  ],
})
export class AppModule {}