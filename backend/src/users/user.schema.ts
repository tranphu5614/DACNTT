import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

export enum Role {
  EMPLOYEE   = 'EMPLOYEE',
  HR_MANAGER = 'HR_MANAGER',
  IT_MANAGER = 'IT_MANAGER',
  ADMIN      = 'ADMIN',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, select: false })
  password!: string;

  @Prop({ type: [String], enum: Object.values(Role), default: [Role.EMPLOYEE] })
  roles!: Role[];
}

export const UserSchema = SchemaFactory.createForClass(User);
