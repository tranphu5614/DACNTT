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
import { MailerService } from '@nestjs-modules/mailer'; // [MỚI]
import { Request as RequestEntity, RequestDocument, RequestStatus } from './schemas/request.schema';
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
    private readonly requestModel: Model<RequestDocument>,
    private readonly priorityClassifier: PriorityClassifierService,
    private readonly mailerService: MailerService, // [MỚI] Inject Mailer
  ) {}

  private getCatalogByTypeKey(typeKey: string) {
    return DEFAULT_CATALOG.find((c) => c.typeKey === typeKey);
  }

  // [MỚI] Helper gửi mail an toàn
  private async sendNotificationEmail(requester: any, subject: string, htmlContent: string) {
    try {
      if (requester && requester.email) {
        await this.mailerService.sendMail({
          to: requester.email,
          subject: subject,
          html: htmlContent,
        });
        this.logger.log(`Email sent to ${requester.email}`);
      }
    } catch (error) {
      this.logger.error('Lỗi gửi mail thông báo:', error);
    }
  }

  // ... (Giữ nguyên các hàm getAvailableRooms, createWithRequester, listMine, listQueue, getById) ...
  
  // ==================================================================
  // 1. LOGIC ĐẶT PHÒNG
  // ==================================================================
  async getAvailableRooms(dateStr: string, fromStr: string, toStr: string, size: RoomSize) {
    // ... (Giữ nguyên code cũ của bạn) ...
    if (!dateStr || !fromStr || !toStr) return [];
    const startISO = `${dateStr}T${fromStr}:00`;
    const endISO = `${dateStr}T${toStr}:00`;
    const start = new Date(startISO);
    const end = new Date(endISO);
    if (isNaN(+start) || isNaN(+end)) throw new BadRequestException('Thời gian không hợp lệ');
    if (end <= start) throw new BadRequestException('Giờ kết thúc phải sau giờ bắt đầu');

    const busy = (await this.requestModel.find({
        typeKey: 'meeting_room_booking',
        approvalStatus: { $ne: 'REJECTED' },
        bookingStart: { $lt: end },
        bookingEnd: { $gt: start },
      }).select('bookingRoomKey').lean().exec()) as BusyDoc[];

    const busyKeys = new Set((busy || []).map((b) => b.bookingRoomKey).filter(Boolean));
    return ROOMS.filter((r) => r.size === size).map((r) => ({ ...r, isBusy: busyKeys.has(r.key), value: r.key, label: r.name }));
  }

  // ==================================================================
  // 2. TẠO REQUEST (CREATE)
  // ==================================================================
  async createWithRequester(requesterId: string, dto: any, files: Express.Multer.File[] = []) {
     // ... (Giữ nguyên code createWithRequester cũ của bạn) ...
     if (typeof dto?.custom === 'string') { try { dto.custom = JSON.parse(dto.custom); } catch { dto.custom = {}; } }
     if (!dto.priority) {
       const textParts = [dto.title, dto.description].filter(Boolean);
       const textToAnalyze = textParts.join('. ');
       if (textToAnalyze && textToAnalyze.trim().length >= 5) {
         const suggested = await this.priorityClassifier.suggestPriority(textToAnalyze);
         dto.priority = suggested || 'MEDIUM';
       } else { dto.priority = 'MEDIUM'; }
     }
     const catalog = dto?.typeKey ? this.getCatalogByTypeKey(dto.typeKey) : null;
     const approvalsFromCatalog = catalog?.approvalFlow?.map((s) => ({ level: s.level, role: s.role })) || [];
     const hasApproval = approvalsFromCatalog.length > 0;

     if (dto?.typeKey === 'meeting_room_booking') {
       const c = dto.custom || {};
       const { size, bookingDate, fromTime, toTime, roomKey } = c;
       if (!size || !bookingDate || !fromTime || !toTime || !roomKey) throw new BadRequestException('Thiếu thông tin đặt phòng');
       const startDt = new Date(`${bookingDate}T${fromTime}:00`);
       const endDt = new Date(`${bookingDate}T${toTime}:00`);
       if (isNaN(+startDt) || isNaN(+endDt) || endDt <= startDt) throw new BadRequestException('Khoảng thời gian không hợp lệ');
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

     const attachments = (files || []).map((f) => ({ filename: f.originalname, path: f.filename, size: f.size, mimetype: f.mimetype }));
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
    // ... (Giữ nguyên) ...
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

  async listQueue(filter: any, page = 1, limit = 10) {
    // ... (Giữ nguyên) ...
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
    // ... (Giữ nguyên) ...
    const roles = user.roles || [];
    if (!roles.length) return [];
    return this.requestModel.find({
        approvalStatus: { $in: ['PENDING', 'IN_REVIEW'] },
        approvals: { $elemMatch: { role: { $in: roles }, decision: { $exists: false } } },
      }).populate('requester', 'name email').sort({ createdAt: -1 }).lean().exec();
  }

  // ==================================================================
  // 4. QUY TRÌNH DUYỆT (APPROVE/REJECT) - [CẬP NHẬT GỬI MAIL]
  // ==================================================================

  async approve(id: string, user: { _id: string; roles?: string[]; name?: string }, comment?: string) {
    // 1. Tìm request và populate thông tin người tạo (để lấy email)
    const doc = await this.requestModel.findById(id).populate('requester');
    if (!doc) throw new NotFoundException('Request not found');

    // 2. Kiểm tra xem đơn đã kết thúc quy trình duyệt chưa
    if (doc.approvalStatus === 'APPROVED' || doc.approvalStatus === 'REJECTED') {
      throw new BadRequestException('Request đã kết thúc quy trình duyệt');
    }

    // 3. Xác định bước duyệt tiếp theo
    const nextLevel = (doc.currentApprovalLevel || 0) + 1;
    const step = (doc.approvals || []).find((a) => a.level === nextLevel);

    // [Safety Check] Nếu không tìm thấy bước tiếp theo dù trạng thái chưa Approved
    if (!step) {
      doc.approvalStatus = 'APPROVED';
      await doc.save();
      return doc;
    }

    // 4. Kiểm tra quyền hạn (Permissions)
    const userRoles = user.roles || [];
    const isAdmin = userRoles.includes('ADMIN');
    const isApproverForStep = userRoles.includes(step.role);

    if (!isAdmin && !isApproverForStep) {
      throw new ForbiddenException(`Bạn không có quyền duyệt bước này (Cần role: ${step.role})`);
    }

    // 5. Cập nhật thông tin người duyệt vào bước hiện tại
    step.approver = new Types.ObjectId(user._id);
    step.approvedAt = new Date();
    step.decision = 'APPROVED';
    step.comment = comment;

    // Tăng level duyệt lên
    doc.currentApprovalLevel = nextLevel;

    // 6. Kiểm tra xem còn bước nào phía sau không
    const stillHasNext = (doc.approvals || []).some(
      (a) => a.level > nextLevel && !a.decision,
    );
    
    // Cập nhật trạng thái duyệt (Approval Status)
    doc.approvalStatus = stillHasNext ? 'IN_REVIEW' : 'APPROVED';

    // ==================================================================
    // [MỚI - QUAN TRỌNG] LOGIC AUTO-COMPLETE TRẠNG THÁI (STATUS)
    // ==================================================================
    // Chỉ chạy logic này khi đơn đã được duyệt hoàn toàn (APPROVED)
    if (doc.approvalStatus === 'APPROVED') {
        // Danh sách các loại yêu cầu "Duyệt là xong luôn" (không cần người thực hiện)
        const autoCompleteTypes = ['meeting_room_booking', 'leave_request']; 
        
        if (autoCompleteTypes.includes(doc.typeKey)) {
            // TH1: Đặt phòng / Nghỉ phép -> Chuyển thành COMPLETED ngay
            doc.status = RequestStatus.COMPLETED;
            doc.resolvedAt = new Date(); // Ghi lại thời gian hoàn thành
        } else {
            // TH2: Các yêu cầu cần thực hiện (IT, Sửa chữa...) 
            // -> Chuyển thành IN_PROGRESS để bộ phận IT thấy và bắt đầu làm
            // Chỉ chuyển nếu trạng thái đang là NEW hoặc PENDING
            if (doc.status === RequestStatus.NEW || doc.status === RequestStatus.PENDING) {
                doc.status = RequestStatus.IN_PROGRESS;
            }
        }
    }

    // 7. Lưu vào Database
    await doc.save();

    // 8. Gửi Email thông báo cho người tạo đơn
    this.sendNotificationEmail(
      doc.requester,
      `[Hệ thống] Yêu cầu được duyệt bước ${step.level}: ${doc.title}`,
      `
        <h3>Yêu cầu của bạn đã được duyệt bước ${step.level}</h3>
        <p><strong>Tiêu đề:</strong> ${doc.title}</p>
        <p><strong>Người duyệt:</strong> ${user.name || 'Quản lý'}</p>
        <p><strong>Nhận xét:</strong> ${comment || 'Không có'}</p>
        <hr/>
        <p>Trạng thái duyệt: <strong>${doc.approvalStatus}</strong></p>
        <p>Trạng thái xử lý: <strong>${doc.status}</strong></p>
      `
    );

    return doc;
  }
  async reject(id: string, user: { _id: string; roles?: string[]; name?: string }, comment?: string) {
    const doc = await this.requestModel.findById(id).populate('requester');
    if (!doc) throw new NotFoundException('Request not found');

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
    const isAdmin = userRoles.includes('ADMIN');
    const isApproverForStep = userRoles.includes(step.role);

    if (!isAdmin && !isApproverForStep) {
      throw new ForbiddenException('Bạn không có quyền từ chối bước này');
    }

    step.approver = new Types.ObjectId(user._id);
    step.approvedAt = new Date();
    step.decision = 'REJECTED';
    step.comment = comment;

    doc.approvalStatus = 'REJECTED';
    // Cũng có thể update status chính của ticket
    doc.status = RequestStatus.REJECTED;

    await doc.save();

    // [MỚI] GỬI EMAIL THÔNG BÁO TỪ CHỐI
    this.sendNotificationEmail(
      doc.requester,
      `[Hệ thống] Yêu cầu bị TỪ CHỐI: ${doc.title}`,
      `
        <h3 style="color: red;">Yêu cầu của bạn đã bị từ chối</h3>
        <p><strong>Tiêu đề:</strong> ${doc.title}</p>
        <p><strong>Người từ chối:</strong> ${user.name || 'Quản lý'}</p>
        <p><strong>Lý do:</strong> ${comment || 'Không có'}</p>
      `
    );

    return doc;
  }

  // ==================================================================
  // 5. CÁC HÀM KHÁC (ADD COMMENT, ASSIGN, EXPORT...)
  // ==================================================================
  // (Giữ nguyên toàn bộ logic bên dưới của bạn)

  async addComment(id: string, userId: string, content: string, isInternal: boolean) {
    const request = await this.requestModel.findByIdAndUpdate(id, { $push: { comments: { content, author: new Types.ObjectId(userId), createdAt: new Date(), isInternal } } }, { new: true }).populate('comments.author', 'name email');
    if (!request) throw new NotFoundException('Request not found');
    return request;
  }

  async assignRequest(id: string, assigneeId: string) {
    const doc = await this.requestModel.findById(id);
    if (!doc) throw new NotFoundException('Request not found');
    if (doc.approvalStatus === 'PENDING') throw new BadRequestException('Yêu cầu này đang chờ duyệt, chưa thể giao việc.');
    if (doc.approvalStatus === 'REJECTED') throw new BadRequestException('Yêu cầu này đã bị từ chối, không thể xử lý.');
    doc.assignedTo = new Types.ObjectId(assigneeId);
    doc.status = RequestStatus.IN_PROGRESS; 
    await doc.save();
    await doc.populate('assignedTo', 'name email');
    this.logger.log(`Assigned Request ${id} to User ${assigneeId}`);
    return doc;
  }

  async updateStatus(id: string, status: string, user: any) {
    const currentUserId = user._id || user.userId || user.sub;
    if (!currentUserId) throw new BadRequestException('Không xác định được User ID thực hiện thao tác.');
    const currentUserIdStr = currentUserId.toString();
    const request = await this.requestModel.findById(id);
    if (!request) throw new NotFoundException('Không tìm thấy yêu cầu.');
    let assigneeIdStr = '';
    if (request.assignedTo) {
      const rawAssignee = request.assignedTo as any;
      assigneeIdStr = rawAssignee._id ? rawAssignee._id.toString() : rawAssignee.toString();
    }
    const roles = (user.roles || []).map((r: string) => r.toUpperCase());
    const isManager = roles.includes('ADMIN') || roles.includes('MANAGER') || roles.includes(`${request.category}_MANAGER`);
    if (status === RequestStatus.COMPLETED || status === RequestStatus.CANCELLED) {
      if (assigneeIdStr !== currentUserIdStr && !isManager) {
        const requesterIdStr = request.requester ? request.requester.toString() : '';
        const isRequester = requesterIdStr === currentUserIdStr;
        if (status === RequestStatus.CANCELLED && isRequester) { /* OK */ } 
        else { throw new ForbiddenException('Bạn không có quyền cập nhật trạng thái này.'); }
      }
    }
    request.status = status as RequestStatus;
    if (status === RequestStatus.COMPLETED) { request.resolvedAt = new Date(); }
    return request.save();
  }

  async suggestDescriptions(query: string): Promise<string[]> {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return ERROR_SUGGESTIONS.map((s) => ({ text: s, score: s.toLowerCase().includes(q) ? 2 : s.toLowerCase().split(' ').some((w) => q.includes(w)) ? 1 : 0, })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, 6).map((x) => x.text);
  }

  async getDashboardStats(category?: string) {
    const matchStage: any = {};
    if (category && category !== 'ALL') { matchStage.category = category; }
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
      { header: 'Người xử lý', key: 'assignee', width: 20 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 },
      { header: 'Hạn xử lý', key: 'dueDate', width: 20 },
    ];
    const requests = await this.requestModel.find().populate('requester', 'name').populate('assignedTo', 'name').sort({ createdAt: -1 }).exec();
    requests.forEach((item) => {
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
    sheet.getRow(1).font = { bold: true };
    return workbook;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async checkSlaBreach() {
    this.logger.log('🔄 Đang quét SLA...');
    const now = new Date();
    const overdueRequests = await this.requestModel.find({
      status: { $nin: ['COMPLETED', 'CANCELLED', 'REJECTED'] }, 
      dueDate: { $lt: now },
      'custom.isSlaBreached': { $ne: true }
    });
    if (overdueRequests.length > 0) {
      this.logger.warn(`⚠️ Phát hiện ${overdueRequests.length} ticket vi phạm SLA!`);
      for (const req of overdueRequests) {
        req.custom = { ...req.custom, isSlaBreached: true };
        req.comments.push({ content: `⚠️ [HỆ THỐNG] Ticket này đã quá hạn xử lý vào lúc ${now.toLocaleString()}`, createdAt: now, isInternal: true, author: null as any });
        await req.save();
      }
    }
  }
}