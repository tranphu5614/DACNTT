import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  IT_MANAGER = 'IT_MANAGER',
  HR_MANAGER = 'HR_MANAGER',
  SALE_MANAGER = 'SALES_MANAGER', // [CHỈ CẦN ROLE NÀY]
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

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

  @Prop({ select: false })
  resetPasswordToken?: string;

  @Prop()
  resetPasswordExpires?: Date;

  @Prop({ default: 12 })
  paidLeaveDaysLeft!: number;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);