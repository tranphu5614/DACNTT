import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  @Prop({ required: true })
  fullName!: string;

  @Prop({ required: true, unique: true }) // Email nên là duy nhất để merge contact
  email!: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop()
  companyName?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);