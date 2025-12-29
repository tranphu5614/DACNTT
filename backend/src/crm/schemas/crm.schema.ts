import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { Customer } from './customer.schema';
import { User } from '../../users/schemas/user.schema';

export type CrmDocument = Crm & Document;

export enum CrmStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  WIN = 'WIN',
  LOSE = 'LOSE'
}

@Schema()
export class CrmComment {
  @Prop({ required: true })
  content!: string; // [FIX] Thêm dấu !

  @Prop({ type: Types.ObjectId, ref: 'User' })
  author!: User;    // [FIX] Thêm dấu !

  @Prop({ default: Date.now })
  createdAt!: Date; // [FIX] Thêm dấu !
}
const CrmCommentSchema = SchemaFactory.createForClass(CrmComment);

@Schema({ timestamps: true })
export class Crm {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customer!: Customer; // [FIX] Thêm dấu !

  @Prop({ required: true })
  requirement!: string; // [FIX] Thêm dấu !

  @Prop({ enum: CrmStatus, default: CrmStatus.NEW })
  status!: CrmStatus;   // [FIX] Thêm dấu !

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo?: User;

  @Prop()
  note?: string;

  @Prop({ type: [CrmCommentSchema], default: [] })
  comments!: CrmComment[]; // [FIX] Thêm dấu !

  @Prop({
    type: [{
      action: String,
      user: { type: Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
      note: String
    }],
    default: []
  })
  history!: any[]; // [FIX] Thêm dấu !
}

export const CrmSchema = SchemaFactory.createForClass(Crm);