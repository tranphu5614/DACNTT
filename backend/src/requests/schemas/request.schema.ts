import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RequestDocument = Request & Document;

// [QUAN TRỌNG] Export Enum này để Service import được
export enum RequestStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',       // Chờ duyệt
  IN_PROGRESS = 'IN_PROGRESS', // Đang xử lý
  APPROVED = 'APPROVED',     // Đã duyệt
  REJECTED = 'REJECTED',     // Từ chối duyệt
  COMPLETED = 'COMPLETED',   // Hoàn thành
  CANCELLED = 'CANCELLED',   // Hủy bỏ
  IN_REVIEW = 'IN_REVIEW'    // Đang chờ cấp cao hơn duyệt
}

// --------------------------------------------------------
// SUB-SCHEMAS
// --------------------------------------------------------

@Schema()
export class ApprovalStep {
  @Prop({ required: true })
  level!: number;

  @Prop({ required: true })
  role!: string; // VD: 'MANAGER', 'IT_MANAGER'

  @Prop({ type: Types.ObjectId, ref: 'User' })
  approver?: Types.ObjectId;

  @Prop()
  approvedAt?: Date;

  @Prop({ enum: ['APPROVED', 'REJECTED'] })
  decision?: string;

  @Prop()
  comment?: string;
}
const ApprovalStepSchema = SchemaFactory.createForClass(ApprovalStep);

@Schema()
export class Comment {
  @Prop({ required: true })
  content!: string;

  // Service đang populate 'comments.author' -> dùng field author
  @Prop({ type: Types.ObjectId, ref: 'User' })
  author?: Types.ObjectId; 
  
  // Backup: Tương thích ngược nếu code cũ dùng user
  @Prop({ type: Types.ObjectId, ref: 'User' })
  user?: Types.ObjectId;

  @Prop({ default: Date.now })
  createdAt!: Date;

  @Prop({ default: false })
  isInternal!: boolean;
}
const CommentSchema = SchemaFactory.createForClass(Comment);

// --------------------------------------------------------
// MAIN SCHEMA
// --------------------------------------------------------

@Schema({ timestamps: true })
export class Request {
  // --- THÔNG TIN CƠ BẢN ---
  @Prop({ required: true })
  category!: string; // IT, HR, GENERAL...

  @Prop({ required: true })
  typeKey!: string; // laptop_request, leave_request...

  @Prop()
  title?: string;

  @Prop()
  description?: string;

  @Prop({ default: 'MEDIUM' })
  priority?: string;

  // [QUAN TRỌNG] Dùng Enum RequestStatus
  @Prop({ 
    type: String, 
    enum: RequestStatus, 
    default: RequestStatus.NEW 
  })
  status!: RequestStatus;

  // --- NGƯỜI DÙNG LIÊN QUAN ---
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  requester!: Types.ObjectId;

  // Hỗ trợ cả 2 tên trường để tương thích mọi phiên bản Service
  // Service mới dùng 'assignedTo', Service cũ dùng 'assignee' -> Khai báo cả 2 để không lỗi
  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignedTo?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  assignee?: Types.ObjectId;

  // --- ĐẶT PHÒNG (Booking Fields - Root Level) --- 
  // Đưa ra root để query check trùng lịch nhanh hơn
  @Prop() bookingRoomKey?: string;
  @Prop() bookingStart?: Date;
  @Prop() bookingEnd?: Date;

  // --- TIỆN ÍCH ---
  @Prop({ type: [CommentSchema], default: [] })
  comments!: Comment[];

  @Prop()
  dueDate?: Date;

  // [QUAN TRỌNG] Để fix lỗi 'resolvedAt does not exist'
  @Prop()
  resolvedAt?: Date;

  @Prop({ type: Object })
  custom?: any; // Form động

  @Prop({ type: [Object], default: [] })
  attachments?: any[]; // File đính kèm

  // --- QUY TRÌNH DUYỆT ---
  @Prop({ default: 'NONE' })
  approvalStatus!: string;

  @Prop({ type: Number, default: 0 })
  currentApprovalLevel!: number;

  @Prop({ type: [ApprovalStepSchema], default: [] })
  approvals!: ApprovalStep[];

  // --- AI & AUTO FIX ---
  @Prop({ type: String })
  aiSuggestion?: string;

  @Prop({ type: String, enum: ['FIXED', 'NOT_FIXED', null], default: null })
  selfFixResult!: 'FIXED' | 'NOT_FIXED' | null;

  // --- LỊCH SỬ (AUDIT LOG) ---
  @Prop({
    type: [{
      action: String,
      user: { type: Types.ObjectId, ref: 'User' },
      timestamp: { type: Date, default: Date.now },
      note: String
    }],
    default: []
  })
  history!: any[];
}

export const RequestSchema = SchemaFactory.createForClass(Request);