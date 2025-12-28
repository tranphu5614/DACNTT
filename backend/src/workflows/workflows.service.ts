import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Workflow, WorkflowDocument } from './schemas/workflow.schema';
import { CreateWorkflowDto } from './dto/create-workflow.dto';

@Injectable()
export class WorkflowsService {
  constructor(@InjectModel(Workflow.name) private workflowModel: Model<WorkflowDocument>) {}

  async createOrUpdate(dto: CreateWorkflowDto) {
    // Upsert: Nếu tồn tại typeKey thì update, chưa thì tạo mới
    return this.workflowModel.findOneAndUpdate(
      { typeKey: dto.typeKey },
      { ...dto },
      { new: true, upsert: true }
    );
  }

  async findAll() {
    return this.workflowModel.find().sort({ category: 1, name: 1 }).exec();
  }

  async findByType(typeKey: string) {
    return this.workflowModel.findOne({ typeKey }).exec();
  }

  async delete(id: string) {
    return this.workflowModel.findByIdAndDelete(id);
  }
}