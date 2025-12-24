import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER', // [MỚI] Role chung cho quản lý
  IT_MANAGER = 'IT_MANAGER',
  HR_MANAGER = 'HR_MANAGER',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  // [MỚI] Lưu tên phòng ban (IT, HR, SALES...)
  @Prop()
  department?: string;

  // [MỚI] Số điện thoại
  @Prop()
  phoneNumber?: string;

  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles!: Role[];
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);