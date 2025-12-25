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

  // [SỬA] Cho phép password null ban đầu (khi Admin tạo invite)
  @Prop({ required: false })
  password?: string;

  @Prop()
  department?: string;

  @Prop()
  phoneNumber?: string;

  @Prop()
  avatar?: string;

  @Prop({ type: [String], enum: Role, default: [Role.USER] })
  roles!: Role[];

  @Prop({ default: false })
  isVerified!: boolean;

  @Prop({ select: false })
  verificationToken?: string;

  // [MỚI] Token reset mật khẩu (Dùng cho chức năng Quên mật khẩu)
  // select: false để không trả về token này trong các query thông thường
  @Prop({ select: false })
  resetPasswordToken?: string;

  // [MỚI] Thời gian hết hạn của token reset
  @Prop()
  resetPasswordExpires?: Date;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);