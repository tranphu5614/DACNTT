import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose'; 
import { Crm, CrmDocument, CrmStatus } from './schemas/crm.schema';
import { Customer, CustomerDocument } from './schemas/customer.schema';

@Injectable()
export class CrmService {
  constructor(
    @InjectModel(Crm.name) private crmModel: Model<CrmDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
  ) {}

  // 1. Logic Public
  async createPublicRequest(data: { fullName: string; email: string; phoneNumber: string; requirement: string; companyName?: string }) {
    let customer = await this.customerModel.findOne({ email: data.email });
    if (!customer) {
      customer = await this.customerModel.create({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        companyName: data.companyName
      });
    } else {
      customer.phoneNumber = data.phoneNumber;
      await customer.save();
    }

    const newDeal = await this.crmModel.create({
      customer: customer._id,
      requirement: data.requirement,
      status: CrmStatus.NEW,
      history: [{
        action: 'CREATED',
        timestamp: new Date(),
        note: 'Customer submitted request from website'
      }]
    });
    return newDeal;
  }

  // 1.1 Logic Internal
  async createBySale(userId: string, data: any) {
    let customer = await this.customerModel.findOne({ 
      $or: [{ email: data.email }, { phoneNumber: data.phoneNumber }] 
    });

    if (!customer) {
      customer = await this.customerModel.create({
        fullName: data.fullName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        companyName: data.companyName
      });
    }

    const newDeal = await this.crmModel.create({
      customer: customer._id,
      requirement: data.requirement,
      note: data.note,
      status: CrmStatus.NEW,
      assignedTo: userId,
      history: [{
        action: 'CREATED_INTERNAL',
        user: userId,
        timestamp: new Date(),
        note: 'Sales staff created this deal manually'
      }]
    });

    return newDeal;
  }

  // 2. Lấy danh sách
  async findAll(user: any) {
    console.log('================================================');
    console.log('⚡ DEBUG: BẮT ĐẦU KIỂM TRA QUYỀN VÀ DỮ LIỆU');

    const userIdStr = user.userId || user._id;
    console.log(`👤 User đang login: ${user.email}`);
    console.log(`🔑 ID trong Token (String): "${userIdStr}"`);

    const query = this.crmModel.find()
      .populate('customer')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 });

    const isManager = user.roles.includes('ADMIN') || user.roles.includes('SALE_MANAGER');
    console.log(`🛡️ Là quản lý? ${isManager}`);

    if (!isManager) {
      console.log('🔎 Đang lọc deal cho nhân viên Sale...');
      
      let userObjectId = null;
      try {
        userObjectId = new Types.ObjectId(userIdStr);
        console.log(`🔑 ID sau khi convert ObjectId: ${userObjectId}`);
      } catch (error) {
        console.error('❌ LỖI: ID trong token không phải định dạng ObjectId hợp lệ!');
      }

      const filter = {
        $or: [
          { assignedTo: userIdStr },       
          { assignedTo: userObjectId },    
          { assignedTo: null },
          { assignedTo: { $exists: false } }
        ]
      };
      
      query.find(filter);
    } else {
        console.log('✅ Manager -> Lấy tất cả');
    }

    const results = await query.exec();
    console.log(`📊 KẾT QUẢ TRẢ VỀ: ${results.length} deals`);

    if (results.length === 0 && !isManager) {
        console.log('⚠️ KHÔNG TÌM THẤY DEAL NÀO. Đang kiểm tra ngẫu nhiên DB...');
        const randomDeal = await this.crmModel.findOne({ assignedTo: { $ne: null } }).lean();
        if (randomDeal) {
            console.log(`ℹ️ MẪU DB: Một deal (ID: ${randomDeal._id}) đang được gán cho:`);
            console.log(`   -> Giá trị: "${randomDeal.assignedTo}"`);
            console.log(`   -> So sánh với Token: "${userIdStr}"`);
            console.log(`   -> Có khớp không? ${String(randomDeal.assignedTo) == String(userIdStr)}`);
        } else {
            console.log('ℹ️ DB đang trống hoặc không có deal nào đã được gán.');
        }
    }
    console.log('================================================');
    
    return results;
  }

  // 3. Lấy chi tiết
  async findOne(id: string) {
    const deal = await this.crmModel.findById(id)
      .populate('customer')
      .populate('assignedTo', 'name email avatar');

    if (!deal) throw new NotFoundException('Deal not found');

    if (deal.comments && deal.comments.length > 0) {
      await deal.populate('comments.author', 'name avatar');
    }
    
    if (deal.history && deal.history.length > 0) {
      await deal.populate('history.user', 'name avatar');
    }

    return deal;
  }

  // 4. Thêm Comment
  async addComment(id: string, userId: string, content: string) {
    return this.crmModel.findByIdAndUpdate(id, {
      $push: { 
        comments: { content, author: userId, createdAt: new Date() } 
      }
    }, { new: true }).populate('comments.author', 'name avatar');
  }

  // 5. Assign Deal [ĐÃ FIX LỖI TYPE VÀ LOGIC]
  async assignDeal(crmId: string, staffId: string | null, managerId?: string) {
    const deal = await this.crmModel.findById(crmId);
    if (!deal) throw new NotFoundException('Deal not found');

    // Cập nhật assignedTo (chấp nhận null)
    deal.assignedTo = staffId as any;

    // Logic trạng thái và ghi chú
    let actionNote = '';
    if (staffId) {
        // Nếu có người nhận -> Chuyển trạng thái sang ASSIGNED
        deal.status = CrmStatus.ASSIGNED;
        actionNote = `Assigned to staff ID: ${staffId}`;
    } else {
        // Nếu bỏ gán (null) -> Chuyển về NEW (hoặc giữ nguyên tùy nghiệp vụ)
        if (deal.status === CrmStatus.ASSIGNED) {
            deal.status = CrmStatus.NEW;
        }
        actionNote = 'Unassigned (Bỏ gán)';
    }
    
    if (!deal.history) deal.history = [];

    deal.history.push({
      action: 'ASSIGNED',
      user: managerId,
      timestamp: new Date(),
      note: actionNote
    });

    return deal.save();
  }

  // 6. Cập nhật trạng thái
  async updateStatus(crmId: string, status: CrmStatus, note?: string, userId?: string) {
    const deal = await this.crmModel.findById(crmId);
    if (!deal) throw new NotFoundException('Deal not found');

    const oldStatus = deal.status;
    deal.status = status;
    if (note) deal.note = note;

    if (!deal.history) deal.history = [];

    deal.history.push({
      action: `STATUS_CHANGE`,
      user: userId,
      timestamp: new Date(),
      note: `${oldStatus} -> ${status}`
    });

    return deal.save();
  }
}