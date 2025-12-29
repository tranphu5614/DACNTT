import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CrmController } from './crm.controller';
import { PublicCrmController } from './public-crm.controller';
import { CrmService } from './crm.service';
import { Crm, CrmSchema } from './schemas/crm.schema';
import { Customer, CustomerSchema } from './schemas/customer.schema';
// [FIX] Import thêm User Schema
import { User, UserSchema } from '../users/schemas/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Crm.name, schema: CrmSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: User.name, schema: UserSchema }, // [FIX] Thêm dòng này để populate hoạt động ổn định
    ]),
  ],
  controllers: [CrmController, PublicCrmController],
  providers: [CrmService],
  exports: [CrmService]
})
export class CrmModule {}