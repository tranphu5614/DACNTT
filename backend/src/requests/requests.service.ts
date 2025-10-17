import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request as RequestEntity, RequestDocument } from './schemas/request.schema';

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(RequestEntity.name)
    private readonly model: Model<RequestDocument>,
  ) {}

  // ĐÃ CÓ: tạo yêu cầu với requester
  async createWithRequester(
    userId: string,
    dto: {
      category: 'HR' | 'IT';
      typeKey: string;
      title: string;
      description: string;
      priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      custom?: Record<string, any>;
    },
    files: Express.Multer.File[] = [],
  ) {
    const requester = new Types.ObjectId(String(userId));

    const doc: Partial<RequestEntity> = { ...dto, requester };
    if (files?.length) {
      (doc as any).attachments = files.map((f) => ({
        filename: f.originalname,
        path: (f as any).path ?? f.filename,
        size: f.size,
        mimetype: f.mimetype,
      }));
    }
    return this.model.create(doc);
  }

  // ĐÃ CÓ: “Yêu cầu của tôi”
  async listMine(userId: string, page = 1, limit = 10) {
    const uid = new Types.ObjectId(String(userId));
    const p = Math.max(1, Math.floor(page));
    const l = Math.min(200, Math.max(1, Math.floor(limit)));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.model.find({ requester: uid }).sort({ createdAt: -1 }).skip(skip).limit(l).lean().exec(),
      this.model.countDocuments({ requester: uid }),
    ]);
    return { items, total, page: p, limit: l };
  }

  // ✅ MỚI: Hàng chờ theo danh mục (HR/IT) + bộ lọc
  async listQueue(
    filter: { category: 'HR' | 'IT'; status?: string; priority?: string; q?: string },
    page = 1,
    limit = 10,
  ) {
    const p = Math.max(1, Math.floor(page));
    const l = Math.min(200, Math.max(1, Math.floor(limit)));
    const skip = (p - 1) * l;

    const query: any = { category: filter.category };
    if (filter.status) query.status = filter.status;
    if (filter.priority) query.priority = filter.priority;
    if (filter.q) {
      const r = new RegExp(filter.q, 'i');
      query.$or = [{ title: r }, { description: r }];
    }

    const [items, total] = await Promise.all([
      this.model.find(query).sort({ createdAt: -1 }).skip(skip).limit(l).lean().exec(),
      this.model.countDocuments(query),
    ]);
    return { items, total, page: p, limit: l };
  }
}
