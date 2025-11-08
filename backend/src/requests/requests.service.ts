import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Request as RequestEntity, RequestDocument } from './schemas/request.schema';
import { ROOMS, RoomSize } from './rooms.constants';
import { DEFAULT_CATALOG } from '../catalog/catalog.data';
import { ERROR_SUGGESTIONS } from './suggestions.data';
import { PriorityClassifierService } from '../ai/priority-classifier.service';

type BusyDoc = { bookingRoomKey?: string };

@Injectable()
export class RequestsService {
  constructor(
    @InjectModel(RequestEntity.name)
    private readonly model: Model<RequestDocument>,
    private readonly priorityClassifier: PriorityClassifierService,
  ) {}

  private getCatalogByTypeKey(typeKey: string) {
    return DEFAULT_CATALOG.find((c) => c.typeKey === typeKey);
  }

  async getAvailableRooms(startISO: string, endISO: string, size: RoomSize) {
    const start = new Date(startISO);
    const end = new Date(endISO);

    if (isNaN(+start) || isNaN(+end)) {
      throw new BadRequestException('start/end không hợp lệ');
    }
    if (end <= start) {
      throw new BadRequestException('end phải sau start');
    }

    const busy = (await this.model
      .find({
        typeKey: 'meeting_room_booking',
        approvalStatus: { $ne: 'REJECTED' },
        bookingStart: { $lt: end },
        bookingEnd: { $gt: start },
      })
      .select('bookingRoomKey')
      .lean()
      .exec()) as BusyDoc[];

    const busyKeys = new Set(
      (busy || []).map((b: BusyDoc) => b.bookingRoomKey).filter(Boolean),
    );

    return ROOMS.filter((r) => r.size === size && !busyKeys.has(r.key));
  }

  async createWithRequester(
    requesterId: string,
    dto: any,
    files: Express.Multer.File[] = [],
  ) {
    if (typeof dto?.custom === 'string') {
      try {
        dto.custom = JSON.parse(dto.custom);
      } catch {
        dto.custom = {};
      }
    }

    // === [AUTO-PRIORITY AI] ===
    if (!dto.priority) {
      const textParts = [dto.title, dto.description].filter(Boolean);
      const textToAnalyze = textParts.join('. ');

      // Chỉ chạy AI nếu có nội dung đủ dài để phân tích (ví dụ >= 5 ký tự)
      if (textToAnalyze && textToAnalyze.trim().length >= 5) {
        const suggested = await this.priorityClassifier.suggestPriority(textToAnalyze);
        if (suggested) {
          dto.priority = suggested;
        } else {
          dto.priority = 'MEDIUM'; // AI không chắc chắn
        }
      } else {
        dto.priority = 'MEDIUM'; // Không đủ thông tin
      }
    }
    // === [END AUTO-PRIORITY] ===

    const catalog = dto?.typeKey ? this.getCatalogByTypeKey(dto.typeKey) : null;
    const approvalsFromCatalog =
      catalog?.approvalFlow?.map((s) => ({
        level: s.level,
        role: s.role,
      })) || [];

    const hasApproval = approvalsFromCatalog.length > 0;

    if (dto?.category === 'HR' && dto?.typeKey === 'meeting_room_booking') {
      const c = dto.custom || {};
      const { size, start, end, roomKey } = c;

      if (!size || !start || !end || !roomKey) {
        throw new BadRequestException('Thiếu size/start/end/roomKey');
      }

      const startDt = new Date(start);
      const endDt = new Date(end);

      if (isNaN(+startDt) || isNaN(+endDt) || endDt <= startDt) {
        throw new BadRequestException('Khoảng thời gian không hợp lệ');
      }

      const available = await this.getAvailableRooms(start, end, size);
      const stillAvailable = available.find((r) => r.key === roomKey);
      if (!stillAvailable) {
        throw new ConflictException(
          'Phòng đã được giữ trong khoảng thời gian này, vui lòng chọn phòng khác.',
        );
      }

      dto.bookingRoomKey = roomKey;
      dto.bookingStart = startDt;
      dto.bookingEnd = endDt;
    }

    const attachments = (files || []).map((f) => ({
      filename: f.originalname,
      path: f.filename,
      size: f.size,
      mimetype: f.mimetype,
    }));

    const doc = await this.model.create({
      category: dto.category,
      typeKey: dto.typeKey,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      status: dto.status ?? 'NEW',
      custom: dto.custom ?? {},
      bookingRoomKey: dto.bookingRoomKey,
      bookingStart: dto.bookingStart,
      bookingEnd: dto.bookingEnd,
      requester: new Types.ObjectId(requesterId),
      attachments,
      approvals: approvalsFromCatalog,
      currentApprovalLevel: 0,
      approvalStatus: hasApproval ? 'PENDING' : 'NONE',
    });

    return doc;
  }

  async listMine(userId: string, page = 1, limit = 10) {
    const uid = new Types.ObjectId(String(userId));
    const p = Math.max(1, Math.floor(page));
    const l = Math.min(200, Math.max(1, Math.floor(limit)));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.model
        .find({ requester: uid })
        .populate('requester', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      this.model.countDocuments({ requester: uid }),
    ]);
    return { items, total, page: p, limit: l };
  }

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
      this.model
        .find(query)
        .populate('requester', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      this.model.countDocuments(query),
    ]);
    return { items, total, page: p, limit: l };
  }

  async getById(id: string) {
    const doc = await this.model
      .findById(id)
      .populate('requester', 'name email')
      .populate('approvals.approver', 'name email') // Populate thêm người duyệt để hiển thị tên họ
      .exec();
    if (!doc) throw new NotFoundException('Request not found');
    return doc;
  }

  async listPendingForApprover(user: { _id: string; roles?: string[] }) {
    const roles = user.roles || [];
    if (!roles.length) return [];

    return this.model
      .find({
        requester: { $ne: new Types.ObjectId(user._id) }, // Loại bỏ request của chính mình
        approvalStatus: { $in: ['PENDING', 'IN_REVIEW'] },
        approvals: {
          $elemMatch: {
            role: { $in: roles },
            decision: { $exists: false },
          },
        },
      })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  async approve(id: string, user: { _id: string; roles?: string[] }, comment?: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Request not found');

    // Chặn tự duyệt
    if (doc.requester.toString() === user._id) {
      throw new ForbiddenException('Bạn không thể tự duyệt yêu cầu của mình');
    }

    if (doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'REJECTED') {
      throw new BadRequestException('Request đã kết thúc quy trình duyệt');
    }

    const nextLevel = (doc.currentApprovalLevel || 0) + 1;
    const step = (doc.approvals || []).find((a) => a.level === nextLevel);

    if (!step) {
      doc.approvalStatus = 'APPROVED';
      await doc.save();
      return doc;
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes(step.role)) {
      throw new ForbiddenException('Bạn không có quyền duyệt bước này');
    }

    step.approver = new Types.ObjectId(user._id);
    step.approvedAt = new Date();
    step.decision = 'APPROVED';
    step.comment = comment;

    doc.currentApprovalLevel = nextLevel;

    const stillHasNext = (doc.approvals || []).some(
      (a) => a.level > nextLevel && !a.decision,
    );
    doc.approvalStatus = stillHasNext ? 'IN_REVIEW' : 'APPROVED';

    await doc.save();
    return doc;
  }

  async reject(id: string, user: { _id: string; roles?: string[] }, comment?: string) {
    const doc = await this.model.findById(id);
    if (!doc) throw new NotFoundException('Request not found');

    // Chặn tự từ chối
    if (doc.requester.toString() === user._id) {
      throw new ForbiddenException('Bạn không thể tự duyệt/từ chối yêu cầu của mình');
    }

    if (doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'REJECTED') {
      throw new BadRequestException('Request đã kết thúc quy trình duyệt');
    }

    const nextLevel = (doc.currentApprovalLevel || 0) + 1;
    const step =
      (doc.approvals || []).find((a) => a.level === nextLevel) ||
      (doc.approvals || []).find((a) => !a.decision);

    if (!step) {
      throw new BadRequestException('Không tìm thấy bước duyệt để từ chối');
    }

    const userRoles = user.roles || [];
    if (!userRoles.includes(step.role)) {
      throw new ForbiddenException('Bạn không có quyền từ chối bước này');
    }

    step.approver = new Types.ObjectId(user._id);
    step.approvedAt = new Date();
    step.decision = 'REJECTED';
    step.comment = comment;

    doc.approvalStatus = 'REJECTED';

    await doc.save();
    return doc;
  }

  async suggestDescriptions(query: string): Promise<string[]> {
    if (!query || query.trim().length < 2) return [];

    const q = query.trim().toLowerCase();

    return ERROR_SUGGESTIONS
      .map((s) => ({
        text: s,
        score:
          s.toLowerCase().includes(q) ? 2 :
          s.toLowerCase().split(' ').some((w) => q.includes(w)) ? 1 : 0,
      }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((x) => x.text);
  }
}