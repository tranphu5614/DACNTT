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

  // [UPDATED] Trả về danh sách phòng kèm trạng thái isBusy
  async getAvailableRooms(dateStr: string, fromStr: string, toStr: string, size: RoomSize) {
    if (!dateStr || !fromStr || !toStr) return [];

    const startISO = `${dateStr}T${fromStr}:00`;
    const endISO = `${dateStr}T${toStr}:00`;

    const start = new Date(startISO);
    const end = new Date(endISO);

    if (isNaN(+start) || isNaN(+end)) {
      throw new BadRequestException('Thời gian không hợp lệ');
    }
    if (end <= start) {
      throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');
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

    // Thay vì filter, ta map để trả về full danh sách kèm trạng thái
    return ROOMS
      .filter((r) => r.size === size)
      .map((r) => ({
        ...r,
        isBusy: busyKeys.has(r.key), // True nếu phòng đang bận
        // Các trường hỗ trợ mapping FE
        value: r.key,
        label: r.name
      }));
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

    // ... (Giữ nguyên logic AI Auto-Priority)
    if (!dto.priority) {
      const textParts = [dto.title, dto.description].filter(Boolean);
      const textToAnalyze = textParts.join('. ');

      if (textToAnalyze && textToAnalyze.trim().length >= 5) {
        const suggested = await this.priorityClassifier.suggestPriority(textToAnalyze);
        if (suggested) {
          dto.priority = suggested;
        } else {
          dto.priority = 'MEDIUM';
        }
      } else {
        dto.priority = 'MEDIUM';
      }
    }

    const catalog = dto?.typeKey ? this.getCatalogByTypeKey(dto.typeKey) : null;
    const approvalsFromCatalog =
      catalog?.approvalFlow?.map((s) => ({
        level: s.level,
        role: s.role,
      })) || [];

    const hasApproval = approvalsFromCatalog.length > 0;

    if (dto?.category === 'HR' && dto?.typeKey === 'meeting_room_booking') {
      const c = dto.custom || {};
      const { size, bookingDate, fromTime, toTime, roomKey } = c;

      if (!size || !bookingDate || !fromTime || !toTime || !roomKey) {
        throw new BadRequestException('Thiếu thông tin đặt phòng (size, date, time, room)');
      }

      const startDt = new Date(`${bookingDate}T${fromTime}:00`);
      const endDt = new Date(`${bookingDate}T${toTime}:00`);

      if (isNaN(+startDt) || isNaN(+endDt) || endDt <= startDt) {
        throw new BadRequestException('Khoảng thời gian không hợp lệ');
      }

      const conflict = await this.model.findOne({
        typeKey: 'meeting_room_booking',
        approvalStatus: { $ne: 'REJECTED' },
        bookingRoomKey: roomKey,
        bookingStart: { $lt: endDt },
        bookingEnd: { $gt: startDt },
      });

      if (conflict) {
        throw new ConflictException('Phòng đã bị đặt trong khung giờ này, vui lòng chọn lại.');
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

  // ... (Giữ nguyên các hàm còn lại: listMine, listQueue, getById, etc.)
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
      .populate('approvals.approver', 'name email')
      .exec();
    if (!doc) throw new NotFoundException('Request not found');
    return doc;
  }

  async listPendingForApprover(user: { _id: string; roles?: string[] }) {
    const roles = user.roles || [];
    if (!roles.length) return [];

    return this.model
      .find({
        requester: { $ne: new Types.ObjectId(user._id) },
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