import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException, 
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User, UserDocument } from './schemas/user.schema';
import { ListUsersQueryDto } from './dto/list-users.query';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {}

  // =================================================================
  // [MỚI] HÀM CẬP NHẬT SỐ NGÀY PHÉP (Dùng cho RequestsService gọi)
  // =================================================================
  async updateLeaveDays(userId: string, newBalance: number) {
    if (!Types.ObjectId.isValid(userId)) return null;
    return this.userModel.findByIdAndUpdate(
      userId, 
      { paidLeaveDaysLeft: newBalance }, 
      { new: true }
    ).exec();
  }

  // =================================================================
  // 1. PUBLIC & AUTH METHODS
  // =================================================================

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  // Logic tạo user: Random password tạm + Gửi mail link đặt password
  async create(dto: CreateUserDto) {
    const exists = await this.userModel.exists({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    // 1. Tạo mật khẩu ngẫu nhiên tạm thời
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const roles: Role[] = dto.roles 
      ? dto.roles.map((v: any) => String(v).toUpperCase() as Role)
      : [Role.USER];

    // 2. Tạo token verify
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const doc = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      department: dto.department ? dto.department.toUpperCase() : undefined,
      phoneNumber: dto.phoneNumber,
      roles,
      isVerified: false, 
      verificationToken,
      paidLeaveDaysLeft: 12, // [MỚI] Mặc định có 12 ngày phép khi tạo mới
    });

    // 3. Gửi email mời kích hoạt
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    const link = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      await this.mailerService.sendMail({
        to: doc.email,
        subject: '[Hệ thống] Mời kích hoạt tài khoản & Đặt mật khẩu',
        html: `
          <h3>Xin chào ${doc.name},</h3>
          <p>Tài khoản của bạn đã được khởi tạo thành công.</p>
          <p>Vui lòng nhấn vào nút bên dưới để thiết lập mật khẩu và kích hoạt tài khoản:</p>
          <a href="${link}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">ĐẶT MẬT KHẨU & KÍCH HOẠT</a>
          <p>Liên kết này chỉ có hiệu lực một lần.</p>
        `,
      });
      console.log(`Activation email sent to ${doc.email}`);
    } catch (e) {
      console.error('Error sending activation email:', e);
    }

    return doc;
  }

  // Hàm kích hoạt tài khoản kèm theo đặt mật khẩu mới
  async activateAccount(token: string, newPassword: string) {
    const user = await this.userModel.findOne({ verificationToken: token });
    
    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    user.password = passwordHash;
    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    return { message: 'Tài khoản đã kích hoạt thành công. Bạn có thể đăng nhập ngay.' };
  }

  async verifyUser(token: string) {
     return this.activateAccount(token, 'DefaultPass123!');
  }

  async getProfile(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid ID');
    const user = await this.userModel.findById(id).select('-password').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // =================================================================
  // [MỚI] 1.1 PASSWORD RESET & CHANGE METHODS
  // =================================================================

  // 1. Quên mật khẩu: Gửi mail chứa token
  async forgotPassword(email: string) {
    const user = await this.userModel.findOne({ email });
    if (!user) throw new NotFoundException('Email không tồn tại trong hệ thống');

    // Tạo token reset
    const token = crypto.randomBytes(32).toString('hex');
    
    // Lưu vào user (đảm bảo schema đã có 2 trường này)
    user.resetPasswordToken = token;
    user.resetPasswordExpires = new Date(Date.now() + 3600000); // 1 giờ
    await user.save();

    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    const link = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: user.email,
        subject: '[Hệ thống] Yêu cầu đặt lại mật khẩu',
        html: `
          <h3>Xin chào ${user.name},</h3>
          <p>Hệ thống nhận được yêu cầu khôi phục mật khẩu cho tài khoản này.</p>
          <p>Nếu là bạn, hãy click vào link bên dưới để đặt lại mật khẩu:</p>
          <a href="${link}" style="padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">ĐẶT LẠI MẬT KHẨU</a>
          <p>Link này sẽ hết hạn sau 60 phút.</p>
          <p>Nếu bạn không yêu cầu, vui lòng bỏ qua email này.</p>
        `,
      });
      console.log(`Reset password email sent to ${email}`);
    } catch (e) {
      console.error('Error sending forgot password email:', e);
    }

    return { message: 'Vui lòng kiểm tra email để đặt lại mật khẩu.' };
  }

  // 2. Đặt lại mật khẩu (từ link email)
  async resetPassword(token: string, newPassword: string) {
    const user = await this.userModel.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: new Date() }, // Kiểm tra còn hạn
    });

    if (!user) throw new BadRequestException('Token không hợp lệ hoặc đã hết hạn');

    // Cập nhật mật khẩu mới
    user.password = await bcrypt.hash(newPassword, 10);
    
    // Xóa token reset
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    
    await user.save();
    return { message: 'Mật khẩu đã được đặt lại thành công.' };
  }

  // 3. Đổi mật khẩu chủ động (khi đã đăng nhập)
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    // Kiểm tra mật khẩu cũ
    const isMatch = await bcrypt.compare(currentPassword, (user as any).password || '');
    if (!isMatch) throw new UnauthorizedException('Mật khẩu hiện tại không đúng');

    // Lưu mật khẩu mới
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { message: 'Đổi mật khẩu thành công' };
  }

  // =================================================================
  // 2. HELPER METHODS
  // =================================================================

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id).select('-password').exec();
  }

  async findByDepartment(dept: string) {
    if (!dept) return [];
    const department = dept.toUpperCase();
    return this.userModel
      .find({
        $or: [
          { department: department },
          { roles: { $in: [department, `${department}_MANAGER`] } }
        ]
      })
      .select('_id name email department roles')
      .lean()
      .exec();
  }

  async findAll() {
    return this.userModel.find().select('-password').sort({ createdAt: -1 }).lean().exec();
  }

  // =================================================================
  // 3. ADMIN METHODS
  // =================================================================

  async update(id: string, dto: UpdateUserDto) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    if (dto.name) user.name = dto.name;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    
    if (dto.avatar) user.avatar = dto.avatar; 

    if (dto.department) {
      user.department = dto.department.toUpperCase();
    }

    if (dto.isManager !== undefined) {
      const dept = user.department; 
      
      let roles = user.roles.filter(r => 
        r !== Role.MANAGER && 
        !r.endsWith('_MANAGER')
      );

      if (dto.isManager && dept) {
        roles.push(Role.MANAGER);
        const specificRole = `${dept}_MANAGER`;
        
        if (!roles.includes(specificRole as Role)) {
          roles.push(specificRole as Role);
        }
      }

      user.roles = roles;
    }

    return user.save();
  }

  async toggleManagerStatus(userId: string, isManager: boolean) {
    return this.update(userId, { isManager });
  }

  async list(q: ListUsersQueryDto) {
    const { page = 1, limit = 10, search, role } = q;
    const filter: FilterQuery<UserDocument> = {};
    if (search) {
      const re = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: re }, { email: re }];
    }
    if (role) {
      const r = String(role).trim();
      filter.roles = { $regex: new RegExp(`^${r}$`, 'i') };
    }
    const [items, total] = await Promise.all([
      this.userModel.find(filter).select('-password').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean().exec(),
      this.userModel.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  }

  async createByAdmin(dto: CreateUserDto) {
    return this.create(dto);
  }

  async deleteById(id: string, currentUserId?: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user id');
    if (currentUserId && String(currentUserId) === String(id)) throw new ForbiddenException('Cannot delete yourself');

    const target = await this.userModel.findById(id).select('_id roles').lean<{ _id: Types.ObjectId; roles: string[] }>();
    if (!target) throw new NotFoundException('User not found');

    const isAdmin = (target.roles || []).map((r) => String(r).toUpperCase()).includes('ADMIN');
    if (isAdmin) {
      const otherAdmins = await this.userModel.countDocuments({ _id: { $ne: id }, roles: { $regex: /^ADMIN$/i } });
      if (otherAdmins === 0) throw new ForbiddenException('Cannot delete the last ADMIN');
    }

    await this.userModel.deleteOne({ _id: id });
    return { deleted: true };
  }
}