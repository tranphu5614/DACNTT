import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
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

  @Prop()
  department?: string;

  @Prop()
  phoneNumber?: string;

  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles!: Role[];

  // [MỚI] Trạng thái đã xác thực hay chưa
  @Prop({ default: false })
  isVerified!: boolean;

  // [MỚI] Token xác thực (Select false để ẩn đi khi query thông thường)
  @Prop({ select: false })
  verificationToken?: string;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);