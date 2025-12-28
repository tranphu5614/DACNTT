import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type WorkflowDocument = Workflow & Document;

@Schema()
class ApprovalStep {
  @Prop({ required: true })
  level!: number; // Thêm dấu !

  @Prop({ required: true })
  role!: string; // Thêm dấu !
}

@Schema({ timestamps: true })
export class Workflow {
  @Prop({ required: true, unique: true })
  typeKey!: string; // Thêm dấu !

  @Prop({ required: true })
  name!: string; // Thêm dấu !

  @Prop({ required: true })
  category!: string; // Thêm dấu !

  @Prop({ type: [SchemaFactory.createForClass(ApprovalStep)], default: [] })
  steps!: ApprovalStep[]; // Thêm dấu !
  
  @Prop({ default: true })
  isActive!: boolean; // Thêm dấu !
}

export const WorkflowSchema = SchemaFactory.createForClass(Workflow);