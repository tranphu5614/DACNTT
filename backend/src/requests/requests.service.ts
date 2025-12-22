import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule'; // <--- IMPORT CRON
import * as ExcelJS from 'exceljs'; // <--- IMPORT EXCEL
import { Request as RequestEntity, RequestDocument } from './schemas/request.schema';
import { ROOMS, RoomSize } from './rooms.constants';
import { DEFAULT_CATALOG } from '../catalog/catalog.data';
import { ERROR_SUGGESTIONS } from './suggestions.data';
import { PriorityClassifierService } from '../ai/priority-classifier.service';

type BusyDoc = { bookingRoomKey?: string };

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectModel(RequestEntity.name)
    private readonly model: Model<RequestDocument>,
    private readonly priorityClassifier: PriorityClassifierService,
  ) {}

  private getCatalogByTypeKey(typeKey: string) {
    return DEFAULT_CATALOG.find((c) => c.typeKey === typeKey);
  }

  // --- 1. LOGIC ĐẶT PHÒNG ---
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

    return ROOMS
      .filter((r) => r.size === size)
      .map((r) => ({
        ...r,
        isBusy: busyKeys.has(r.key),
        value: r.key,
        label: r.name
      }));
  }

  // --- 2. TẠO REQUEST ---
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

    if (!dto.priority) {
      const textParts = [dto.title, dto.description].filter(Boolean);
      const textToAnalyze = textParts.join('. ');

      if (textToAnalyze && textToAnalyze.trim().length >= 5) {
        const suggested = await this.priorityClassifier.suggestPriority(textToAnalyze);
        dto.priority = suggested || 'MEDIUM';
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

    if (dto?.typeKey === 'meeting_room_booking') {
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

    // Tính toán hạn xử lý (SLA) đơn giản: URGENT = 4h, HIGH = 24h, khác = 3 ngày
    let dueDate = new Date();
    if (dto.priority === 'URGENT') dueDate.setHours(dueDate.getHours() + 4);
    else if (dto.priority === 'HIGH') dueDate.setHours(dueDate.getHours() + 24);
    else dueDate.setDate(dueDate.getDate() + 3);

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
      assignedTo: null,
      dueDate: dueDate, // Lưu hạn xử lý
      comments: []
    });

    return doc;
  }

  // --- 3. CÁC CHỨC NĂNG LIST/GET ---
  async listMine(userId: string, page = 1, limit = 10) {
    const uid = new Types.ObjectId(String(userId));
    const p = Math.max(1, Math.floor(page));
    const l = Math.min(200, Math.max(1, Math.floor(limit)));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.model
        .find({ requester: uid })
        .populate('requester', 'name email')
        .populate('assignedTo', 'name email')
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
    filter: { category: string; status?: string; priority?: string; q?: string },
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
        .populate('assignedTo', 'name email')
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
      .populate('requester', 'name email department')
      .populate('assignedTo', 'name email')
      .populate('approvals.approver', 'name email')
      .populate('comments.author', 'name email')
      .exec();
    if (!doc) throw new NotFoundException('Request not found');
    return doc;
  }

  // --- 4. APPROVE/REJECT ---
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

  // --- 5. COMMENT & ASSIGN ---
  async addComment(id: string, userId: string, content: string, isInternal: boolean) {
    const request = await this.model.findByIdAndUpdate(
      id,
      {
        $push: {
          comments: {
            content,
            author: new Types.ObjectId(userId),
            createdAt: new Date(),
            isInternal
          }
        }
      },
      { new: true }
    ).populate('comments.author', 'name email');

    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async assignRequest(id: string, assigneeId: string) {
    const request = await this.model.findByIdAndUpdate(
      id,
      { 
        assignedTo: new Types.ObjectId(assigneeId),
        status: 'IN_PROGRESS' 
      },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!request) throw new NotFoundException('Request not found');
    this.logger.log(`Assigned Request ${id} to User ${assigneeId}`);
    return request;
  }

  async getDashboardStats(category?: string) {
    // Tạo bộ lọc: Nếu có category thì lọc, nếu không thì lấy tất cả
    const matchStage: any = {};
    if (category && category !== 'ALL') {
      matchStage.category = category;
    }

    const stats = await this.model.aggregate([
      // Bước 1: Lọc dữ liệu theo category trước (nếu có)
      { $match: matchStage },
      
      // Bước 2: Gom nhóm tính toán
      {
        $facet: {
          statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }],
          categoryCounts: [{ $group: { _id: "$category", count: { $sum: 1 } } }],
          urgentCount: [{ $match: { priority: "URGENT" } }, { $count: "count" }]
        }
      }
    ]);
    return stats[0] || {};
  }

  // ======================================================
  // [MỚI] CHỨC NĂNG XUẤT EXCEL
  // ======================================================
  async exportToExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách yêu cầu');

    // Định nghĩa cột
    sheet.columns = [
      { header: 'Mã YC', key: '_id', width: 25 },
      { header: 'Tiêu đề', key: 'title', width: 30 },
      { header: 'Danh mục', key: 'category', width: 15 },
      { header: 'Mức độ', key: 'priority', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Người tạo', key: 'requester', width: 20 },
      { header: 'Người xử lý', key: 'assignee', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
      { header: 'Hạn xử lý', key: 'dueDate', width: 20 },
    ];

    // Lấy dữ liệu
    const requests = await this.model
      .find()
      .populate('requester', 'name')
      .populate('assignedTo', 'name')
      .sort({ createdAt: -1 })
      .exec();

    // Ghi dữ liệu vào file
    requests.forEach((item) => {
      // [FIX QUAN TRỌNG] Ép kiểu sang any để tránh lỗi build TypeScript
      const req = item as any; 
      
      sheet.addRow({
        _id: req._id ? req._id.toString() : '',
        title: req.title,
        category: req.category,
        priority: req.priority,
        status: req.status,
        requester: req.requester?.name || '',
        assignee: req.assignedTo?.name || '',
        createdAt: req.createdAt ? new Date(req.createdAt).toLocaleString() : '',
        dueDate: req.dueDate ? new Date(req.dueDate).toLocaleString() : '',
      });
    });

    // Style đơn giản cho header
    sheet.getRow(1).font = { bold: true };
    
    return workbook;
  }

  // ======================================================
  // [MỚI] CHỨC NĂNG SLA MONITORING (CRON JOB)
  // ======================================================
  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkSlaBreach() {
    this.logger.log('🔄 Đang quét SLA...');
    const now = new Date();
    
    // Tìm ticket chưa xong & quá hạn & chưa đánh dấu
    const overdueRequests = await this.model.find({
      status: { $nin: ['COMPLETED', 'CANCELLED', 'REJECTED'] }, 
      dueDate: { $lt: now },
      'custom.isSlaBreached': { $ne: true }
    });

    if (overdueRequests.length > 0) {
      this.logger.warn(`⚠️ Phát hiện ${overdueRequests.length} ticket vi phạm SLA!`);
      
      for (const req of overdueRequests) {
        req.custom = { ...req.custom, isSlaBreached: true };
        
        req.comments.push({
            content: `⚠️ [HỆ THỐNG] Ticket này đã quá hạn xử lý vào lúc ${now.toLocaleString()}`,
            createdAt: now,
            isInternal: true,
            author: null as any
        });

        await req.save();
      }
    }
  }
}