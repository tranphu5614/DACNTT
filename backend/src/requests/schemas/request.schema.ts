// backend/src/requests/schemas/request.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestDocument = Request & Document;

@Schema({ timestamps: true })
export class Request {
  @Prop({ required: true })
  category!: 'HR' | 'IT';

  @Prop({ required: true })
  typeKey!: string;

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop()
  priority?: string;

  // TRẠNG THÁI YÊU CẦU
  @Prop({
    default: 'NEW',
    enum: ['NEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  })
  status!: string;

  @Prop({ type: Object })
  custom?: any;

  // Người tạo yêu cầu
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requester!: Types.ObjectId;

  // --- Đặt phòng (nếu có) ---
  @Prop()
  bookingRoomKey?: string;

  @Prop()
  bookingStart?: Date;

  @Prop()
  bookingEnd?: Date;

  // --- File đính kèm ---
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
  attachments?: {
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  }[];

  // --- Quy trình duyệt ---
  @Prop({
    default: 'NONE',
  })
  approvalStatus!: 'NONE' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

  @Prop({ type: Number, default: 0 })
  currentApprovalLevel!: number;

  @Prop({
    type: [
      {
        level: Number,
        role: String,
        approver: { type: Types.ObjectId, ref: 'User' },
        approvedAt: Date,
        decision: String,
        comment: String,
      },
    ],
    default: [],
  })
  approvals!: {
    level: number;
    role: string;
    approver?: Types.ObjectId;
    approvedAt?: Date;
    decision?: 'APPROVED' | 'REJECTED';
    comment?: string;
  }[];

  // =============== PHẦN MỚI  ===============

  // Gợi ý sửa lỗi do AI phân tích
  @Prop({ type: String })
  aiSuggestion?: string;

  // Kết quả tự sửa lỗi của người dùng
  @Prop({
    type: String,
    enum: ['FIXED', 'NOT_FIXED', null],
    default: null,
  })
  selfFixResult!: 'FIXED' | 'NOT_FIXED' | null;
}

export const RequestSchema = SchemaFactory.createForClass(Request);
