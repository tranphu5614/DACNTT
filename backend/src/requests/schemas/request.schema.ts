import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestDocument = Request & Document;

@Schema({ timestamps: true })
export class Request {
  @Prop({ type: String, enum: ['HR', 'IT'], required: true, index: true })
  category!: 'HR' | 'IT';

  @Prop({ type: String, required: true })
  typeKey!: string;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], required: true })
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @Prop({ type: String, enum: ['OPEN', 'IN_PROGRESS', 'DONE', 'REJECTED'], default: 'OPEN', index: true })
  status!: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'REJECTED';

  @Prop({ type: Object })
  custom?: Record<string, any>;

  @Prop({
    type: [
      {
        filename: String,
        path: String,
        size: Number,
        mimetype: String,
      },
    ],
    default: [],
  })
  attachments?: Array<{
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  }>;

  // ✅ NGƯỜI TẠO YÊU CẦU (bắt buộc)
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requester!: Types.ObjectId;
}

export const RequestSchema = SchemaFactory.createForClass(Request);
