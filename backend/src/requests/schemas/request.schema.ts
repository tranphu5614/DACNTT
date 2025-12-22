import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestDocument = Request & Document;

@Schema({ timestamps: true })
export class Request {
  // Cho phép category tự do thay vì Enum cứng
  @Prop({ required: true })
  category!: string; 

  @Prop({ required: true })
  typeKey!: string;

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  priority?: string;

  @Prop({
    default: 'NEW',
    enum: ['NEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  })
  status!: string;

  // Người tạo
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requester!: Types.ObjectId;

  // --- MỚI: NGƯỜI ĐƯỢC GIAO VIỆC ---
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo?: Types.ObjectId;

  // --- MỚI: HỆ THỐNG COMMENT ---
  @Prop({
    type: [{
      content: { type: String, required: true },
      author: { type: Types.ObjectId, ref: 'User' },
      createdAt: { type: Date, default: Date.now },
      isInternal: { type: Boolean, default: false } // Comment nội bộ chỉ quản lý thấy
    }],
    default: [],
  })
  comments!: {
    content: string;
    author: Types.ObjectId;
    createdAt: Date;
    isInternal: boolean;
  }[];

  // --- MỚI: SLA & DEADLINE ---
  @Prop()
  dueDate?: Date;

  // Các trường cũ giữ nguyên
  @Prop({ type: Object })
  custom?: any;

  @Prop({ type: [Object], default: [] })
  attachments?: any[];

  @Prop({ default: 'NONE' })
  approvalStatus!: string;

  @Prop({ type: Number, default: 0 })
  currentApprovalLevel!: number;

  @Prop({ type: [Object], default: [] })
  approvals!: any[];

  @Prop({ type: String })
  aiSuggestion?: string;

  @Prop({ type: String, enum: ['FIXED', 'NOT_FIXED', null], default: null })
  selfFixResult!: 'FIXED' | 'NOT_FIXED' | null;
}

export const RequestSchema = SchemaFactory.createForClass(Request);