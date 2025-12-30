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
import { Cron, CronExpression } from '@nestjs/schedule';
import * as ExcelJS from 'exceljs';
// ✅ THAY ĐỔI: Import MailService (Brevo API)
import { MailService } from '../mail/mail.service'; 
import { Request as RequestEntity, RequestDocument, RequestStatus } from './schemas/request.schema';
import { ROOMS, RoomSize } from './rooms.constants';
import { DEFAULT_CATALOG } from '../catalog/catalog.data';
import { ERROR_SUGGESTIONS } from './suggestions.data';
import { PriorityClassifierService } from '../ai/priority-classifier.service';
import { UsersService } from '../users/users.service';
import { WorkflowsService } from '../workflows/workflows.service';

type BusyDoc = { bookingRoomKey?: string };

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);

  constructor(
    @InjectModel(RequestEntity.name)
    private readonly requestModel: Model<RequestDocument>,
    private readonly priorityClassifier: PriorityClassifierService,
    // ✅ THAY ĐỔI: Inject MailService mới (Thay cho MailerService cũ)
    private readonly mailService: MailService, 
    private readonly usersService: UsersService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  private getCatalogByTypeKey(typeKey: string) {
    return DEFAULT_CATALOG.find((c) => c.typeKey === typeKey);
  }

  // ==================================================================
  // HELPER: TÍNH SỐ NGÀY LÀM VIỆC (TRỪ T7, CN)
  // ==================================================================
  private calculateWorkingDays(start: Date, end: Date): number {
    let count = 0;
    const cur = new Date(start); 
    cur.setHours(0, 0, 0, 0);
    
    const last = new Date(end); 
    last.setHours(0, 0, 0, 0);

    while (cur <= last) {
      const dayOfWeek = cur.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        count++;
      }
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  }

  // ==================================================================
  // HELPER: GỬI EMAIL THÔNG BÁO (ĐÃ CẬP NHẬT)
  // ==================================================================
  private async sendNotificationEmail(toUser: any, subject: string, htmlContent: string) {
    try {
      const email = toUser?.email || (typeof toUser === 'string' ? toUser : null);
      if (email) {
        // ✅ THAY ĐỔI: Gọi hàm sendMail với 3 tham số rời (to, subject, content)
        await this.mailService.sendMail(
          email,
          subject,
          htmlContent,
        );
        this.logger.log(`Notification email sent to ${email}`);
      }
    } catch (error) {
      this.logger.error('Lỗi gửi mail thông báo:', error);
    }
  }

  // ==================================================================
  // HELPER: TỰ ĐỘNG GIAO VIỆC (AUTO-ASSIGN)
  // ==================================================================
  private async autoAssignTask(category: string): Promise<string | null> {
    const candidates = await this.usersService.findByDepartment(category);
    if (!candidates || candidates.length === 0) {
      this.logger.warn(`Auto-Assign: Không tìm thấy nhân viên nào thuộc phòng ${category}`);
      return null;
    }

    let selectedUser = null;
    let minLoad = Infinity;

    for (const user of candidates) {
      const load = await this.requestModel.countDocuments({
        assignedTo: user._id,
        status: RequestStatus.IN_PROGRESS
      });
      if (load < minLoad) {
        minLoad = load;
        selectedUser = user;
      }
    }
    return selectedUser ? selectedUser._id.toString() : null;
  }

  // ==================================================================
  // 1. LOGIC ĐẶT PHÒNG
  // ==================================================================
  async getAvailableRooms(dateStr: string, fromStr: string, toStr: string, size: RoomSize) {
    if (!dateStr || !fromStr || !toStr) return [];

    const startISO = `${dateStr}T${fromStr}:00`;
    const endISO = `${dateStr}T${toStr}:00`;
    const start = new Date(startISO);
    const end = new Date(endISO);

    if (isNaN(+start) || isNaN(+end)) throw new BadRequestException('Thời gian không hợp lệ');
    if (end <= start) throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');

    const busy = (await this.requestModel
      .find({
        typeKey: 'meeting_room_booking',
        approvalStatus: { $ne: 'REJECTED' },
        bookingStart: { $lt: end },
        bookingEnd: { $gt: start },
      })
      .select('bookingRoomKey')
      .lean()
      .exec()) as BusyDoc[];

    const busyKeys = new Set((busy || []).map((b) => b.bookingRoomKey).filter(Boolean));
    return ROOMS
      .filter((r) => r.size === size)
      .map((r) => ({
        ...r,
        isBusy: busyKeys.has(r.key),
        value: r.key,
        label: r.name
      }));
  }

  // ==================================================================
  // 2. TẠO REQUEST (CREATE)
  // ==================================================================
  async createWithRequester(requesterId: string, dto: any, files: Express.Multer.File[] = []) {
    if (typeof dto?.custom === 'string') {
      try { dto.custom = JSON.parse(dto.custom); } catch { dto.custom = {}; }
    }

    // --- XỬ LÝ NGHỈ PHÉP (LEAVE REQUEST) ---
    if (dto.typeKey === 'leave_request') {
        const { leaveType, fromDate, toDate } = dto.custom || {};
        
        if (!leaveType || !fromDate || !toDate) {
            throw new BadRequestException('Vui lòng chọn loại nghỉ và thời gian.');
        }

        const start = new Date(fromDate);
        const end = new Date(toDate);
        if (start > end) throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');

        const daysRequested = this.calculateWorkingDays(start, end);
        
        if (daysRequested === 0) {
             throw new BadRequestException('Bạn đang chọn toàn ngày nghỉ cuối tuần. Vui lòng kiểm tra lại.');
        }

        const user: any = await this.usersService.findById(requesterId);
        const currentBalance = user?.paidLeaveDaysLeft ?? 0;

        if (leaveType === 'PAID') {
            if (currentBalance < daysRequested) {
                throw new BadRequestException(
                    `Bạn chỉ còn ${currentBalance} ngày phép có lương. Không đủ để nghỉ ${daysRequested} ngày làm việc.`
                );
            }
            await this.usersService.updateLeaveDays(requesterId, currentBalance - daysRequested);
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

    // --- [LOGIC MỚI QUAN TRỌNG] Lấy quy trình duyệt (Workflow) ---
    let approvalsFromCatalog = [];

    const dbWorkflow = await this.workflowsService.findByType(dto.typeKey);
    
    if (dbWorkflow && dbWorkflow.steps.length > 0) {
       approvalsFromCatalog = dbWorkflow.steps.map(s => ({ level: s.level, role: s.role }));
    } else {
       const catalog = dto?.typeKey ? this.getCatalogByTypeKey(dto.typeKey) : null;
       approvalsFromCatalog = catalog?.approvalFlow?.map((s) => ({ level: s.level, role: s.role })) || [];
    }

    const hasApproval = approvalsFromCatalog.length > 0;

    if (dto?.typeKey === 'meeting_room_booking') {
      const c = dto.custom || {};
      const { size, bookingDate, fromTime, toTime, roomKey } = c;

      if (!size || !bookingDate || !fromTime || !toTime || !roomKey) {
        throw new BadRequestException('Thiếu thông tin đặt phòng');
      }

      const startDt = new Date(`${bookingDate}T${fromTime}:00`);
      const endDt = new Date(`${bookingDate}T${toTime}:00`);

      if (isNaN(+startDt) || isNaN(+endDt) || endDt <= startDt) {
        throw new BadRequestException('Khoảng thời gian không hợp lệ');
      }

      const conflict = await this.requestModel.findOne({
        typeKey: 'meeting_room_booking',
        approvalStatus: { $ne: 'REJECTED' },
        bookingRoomKey: roomKey,
        bookingStart: { $lt: endDt },
        bookingEnd: { $gt: startDt },
      });

      if (conflict) throw new ConflictException('Phòng đã bị đặt trong khung giờ này.');
      dto.bookingRoomKey = roomKey;
      dto.bookingStart = startDt;
      dto.bookingEnd = endDt;
    }

    const attachments = (files || []).map((f) => ({
      filename: f.originalname, path: f.filename, size: f.size, mimetype: f.mimetype,
    }));

    let dueDate = new Date();
    if (dto.priority === 'URGENT') dueDate.setHours(dueDate.getHours() + 4);
    else if (dto.priority === 'HIGH') dueDate.setHours(dueDate.getHours() + 24);
    else dueDate.setDate(dueDate.getDate() + 3);

    const doc = await this.requestModel.create({
      category: dto.category,
      typeKey: dto.typeKey,
      title: dto.title,
      description: dto.description,
      priority: dto.priority,
      status: dto.status ?? RequestStatus.NEW,
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
      dueDate: dueDate,
      comments: []
    });

    return doc;
  }

  // ==================================================================
  // 3. READ METHODS
  // ==================================================================
  async listMine(userId: string, page = 1, limit = 10) {
    const uid = new Types.ObjectId(String(userId));
    const p = Math.max(1, Math.floor(page));
    const l = Math.min(200, Math.max(1, Math.floor(limit)));
    const skip = (p - 1) * l;

    const [items, total] = await Promise.all([
      this.requestModel.find({ requester: uid }).populate('requester', 'name email').populate('assignedTo', 'name email').sort({ createdAt: -1 }).skip(skip).limit(l).lean().exec(),
      this.requestModel.countDocuments({ requester: uid }),
    ]);
    return { items, total, page: p, limit: l };
  }

  async listAssigned(userId: string, page = 1, limit = 10) {
    const uid = new Types.ObjectId(String(userId));
    const p = Math.max(1, Math.floor(page));
    const l = Math.min(200, Math.max(1, Math.floor(limit)));
    const skip = (p - 1) * l;

    const query = { assignedTo: uid };

    const [items, total] = await Promise.all([
      this.requestModel
        .find(query)
        .populate('requester', 'name email department')
        .populate('assignedTo', 'name email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(l)
        .lean()
        .exec(),
      this.requestModel.countDocuments(query),
    ]);
    return { items, total, page: p, limit: l };
  }

  async listQueue(filter: { category: string; status?: string; priority?: string; q?: string }, page = 1, limit = 10) {
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
      this.requestModel.find(query).populate('requester', 'name email').populate('assignedTo', 'name email').sort({ createdAt: -1 }).skip(skip).limit(l).lean().exec(),
      this.requestModel.countDocuments(query),
    ]);
    return { items, total, page: p, limit: l };
  }

  async getById(id: string) {
    const doc = await this.requestModel.findById(id).populate('requester', 'name email department phoneNumber').populate('assignedTo', 'name email').populate('approvals.approver', 'name email').populate('comments.author', 'name email').exec();
    if (!doc) throw new NotFoundException('Request not found');
    return doc;
  }
  
  async listPendingForApprover(user: { _id: string; roles?: string[] }) {
    const roles = user.roles || [];
    if (!roles.length) return [];
    return this.requestModel.find({
        approvalStatus: { $in: ['PENDING', 'IN_REVIEW'] },
        approvals: { $elemMatch: { role: { $in: roles }, decision: { $exists: false } } },
      })
      .populate('requester', 'name email')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // ==================================================================
  // 4. QUY TRÌNH DUYỆT (APPROVE/REJECT)
  // ==================================================================
  async approve(id: string, user: { _id: string; roles?: string[]; name?: string }, comment?: string) {
    const doc = await this.requestModel.findById(id).populate('requester');
    if (!doc) throw new NotFoundException('Request not found');
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
    const isAdmin = userRoles.includes('ADMIN');
    const isApproverForStep = userRoles.includes(step.role);

    if (!isAdmin && !isApproverForStep) {
      throw new ForbiddenException(`Bạn không có quyền duyệt bước này (Cần role: ${step.role})`);
    }

    step.approver = new Types.ObjectId(user._id);
    step.approvedAt = new Date();
    step.decision = 'APPROVED';
    step.comment = comment;
    doc.currentApprovalLevel = nextLevel;

    const stillHasNext = (doc.approvals || []).some((a) => a.level > nextLevel && !a.decision);
    doc.approvalStatus = stillHasNext ? 'IN_REVIEW' : 'APPROVED';

    if (doc.approvalStatus === 'APPROVED') {
        const autoCompleteTypes = ['meeting_room_booking', 'leave_request'];
        if (autoCompleteTypes.includes(doc.typeKey)) {
            doc.status = RequestStatus.COMPLETED;
            doc.resolvedAt = new Date();
        } else {
            if (doc.status === RequestStatus.NEW || doc.status === RequestStatus.PENDING) {
                doc.status = RequestStatus.IN_PROGRESS;
                const bestAssigneeId = await this.autoAssignTask(doc.category);
                if (bestAssigneeId) {
                   doc.assignedTo = new Types.ObjectId(bestAssigneeId);
                   const assignee = await this.usersService.findById(bestAssigneeId);
                   this.sendNotificationEmail(assignee, `[Giao việc] ${doc.title}`, `<h3>Hệ thống tự động giao việc</h3>`);
                }
            }
        }
    }
    await doc.save();
    this.sendNotificationEmail(doc.requester, `[Hệ thống] Đã duyệt bước ${step.level}`, `<p>Trạng thái: ${doc.approvalStatus}</p>`);
    return doc;
  }

  async reject(id: string, user: { _id: string; roles?: string[]; name?: string }, comment?: string) {
    const doc = await this.requestModel.findById(id).populate('requester');
    if (!doc) throw new NotFoundException('Request not found');
    if (doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'REJECTED') {
      throw new BadRequestException('Request đã kết thúc quy trình duyệt');
    }

    const nextLevel = (doc.currentApprovalLevel || 0) + 1;
    const step = (doc.approvals || []).find((a) => a.level === nextLevel) || (doc.approvals || []).find((a) => !a.decision);
    if (!step) throw new BadRequestException('Không tìm thấy bước duyệt');

    const userRoles = user.roles || [];
    const isAdmin = userRoles.includes('ADMIN');
    const isApproverForStep = userRoles.includes(step.role);
    if (!isAdmin && !isApproverForStep) throw new ForbiddenException('Không có quyền từ chối');

    step.approver = new Types.ObjectId(user._id);
    step.approvedAt = new Date();
    step.decision = 'REJECTED';
    step.comment = comment;

    doc.approvalStatus = 'REJECTED';
    doc.status = RequestStatus.REJECTED;
    await doc.save();
    this.sendNotificationEmail(doc.requester, `[Hệ thống] Bị TỪ CHỐI`, `<p>Lý do: ${comment}</p>`);
    return doc;
  }

  // ==================================================================
  // 5. CÁC HÀM KHÁC
  // ==================================================================
  async addComment(id: string, userId: string, content: string, isInternal: boolean) {
    const request = await this.requestModel.findByIdAndUpdate(id, { $push: { comments: { content, author: new Types.ObjectId(userId), createdAt: new Date(), isInternal } } }, { new: true }).populate('comments.author', 'name email');
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async assignRequest(id: string, assigneeId: string) {
    const doc = await this.requestModel.findById(id);
    if (!doc) throw new NotFoundException('Request not found');
    if (doc.approvalStatus === 'PENDING') throw new BadRequestException('Đang chờ duyệt');
    if (doc.approvalStatus === 'REJECTED') throw new BadRequestException('Đã bị từ chối');

    doc.assignedTo = new Types.ObjectId(assigneeId);
    doc.status = RequestStatus.IN_PROGRESS; 
    await doc.save();
    return doc;
  }

  async updateStatus(id: string, status: string, user: any) {
    const currentUserId = user._id || user.userId || user.sub;
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu.');

    let assigneeIdStr = '';
    if (request.assignedTo) {
      const rawAssignee = request.assignedTo as any;
      assigneeIdStr = rawAssignee._id ? rawAssignee._id.toString() : rawAssignee.toString();
    }

    const roles = (user.roles || []).map((r: string) => r.toUpperCase());
    const isManager = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes(`${request.category}_MANAGER`);
    const isAssignee = assigneeIdStr === currentUserId.toString();
    const isRequester = request.requester?.toString() === currentUserId.toString();

    if (!isManager) {
        if (status === RequestStatus.CANCELLED) {
            if (!isRequester && !isAssignee) {
                throw new ForbiddenException('Bạn không có quyền hủy yêu cầu này.');
            }
        } else {
            if (!isAssignee) {
                throw new ForbiddenException('Bạn không phải người được giao việc nên không thể cập nhật trạng thái.');
            }
        }
    }

    request.status = status as RequestStatus;
    if (status === RequestStatus.COMPLETED) request.resolvedAt = new Date();
    return request.save();
  }

  async suggestDescriptions(query: string): Promise<string[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return ERROR_SUGGESTIONS.map((s) => ({ text: s, score: s.toLowerCase().includes(q) ? 2 : s.toLowerCase().split(' ').some((w) => q.includes(w)) ? 1 : 0 })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map((x) => x.text);
  }

  async getDashboardStats(category?: string) {
    const matchStage: any = {};
    if (category && category !== 'ALL') matchStage.category = category;
    const stats = await this.requestModel.aggregate([
      { $match: matchStage },
      { $facet: { statusCounts: [{ $group: { _id: "$status", count: { $sum: 1 } } }], categoryCounts: [{ $group: { _id: "$category", count: { $sum: 1 } } }], urgentCount: [{ $match: { priority: "URGENT" } }, { $count: "count" }] } }
    ]);
    return stats[0] || {};
  }

  async exportToExcel() {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh sách yêu cầu');
    sheet.columns = [
      { header: 'Mã YC', key: '_id', width: 25 },
      { header: 'Tiêu đề', key: 'title', width: 30 },
      { header: 'Danh mục', key: 'category', width: 15 },
      { header: 'Mức độ', key: 'priority', width: 12 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Người tạo', key: 'requester', width: 20 },
    ];
    const requests = await this.requestModel.find().populate('requester', 'name').sort({ createdAt: -1 }).exec();
    requests.forEach((req: any) => {
      sheet.addRow({ _id: req._id, title: req.title, category: req.category, priority: req.priority, status: req.status, requester: req.requester?.name });
    });
    return workbook;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkSlaBreach() {
    const now = new Date();
    const overdueRequests = await this.requestModel.find({
      status: { $nin: ['COMPLETED', 'CANCELLED', 'REJECTED'] }, 
      dueDate: { $lt: now },
      $or: [{ 'custom.isSlaBreached': { $exists: false } }, { 'custom.isSlaBreached': false }]
    }).populate('requester').populate('assignedTo');

    for (const req of overdueRequests) {
        req.custom = { ...req.custom, isSlaBreached: true };
        req.comments.push({ content: `⚠️ [CẢNH BÁO] Quá hạn xử lý`, createdAt: now, isInternal: true, author: null as any });
        await req.save();
        this.sendNotificationEmail(req.requester, `[⚠️ QUÁ HẠN] ${req.title}`, `<p>Ticket đã quá hạn.</p>`);
    }
  }
}