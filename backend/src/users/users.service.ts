import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto'; // [MỚI]
import { MailerService } from '@nestjs-modules/mailer'; // [MỚI]
import { ConfigService } from '@nestjs/config'; // [MỚI]

import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Role, User, UserDocument } from './schemas/user.schema';
import { ListUsersQueryDto } from './dto/list-users.query';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly mailerService: MailerService, // [MỚI]
    private readonly configService: ConfigService, // [MỚI]
  ) {}

  // =================================================================
  // 1. PUBLIC & AUTH METHODS
  // =================================================================

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  // [CẬP NHẬT] Thêm logic tạo token và gửi mail
  async create(dto: CreateUserDto) {
    const exists = await this.userModel.exists({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const roles: Role[] = dto.roles 
      ? dto.roles.map((v: any) => String(v).toUpperCase() as Role)
      : [Role.USER];

    // [MỚI] Tạo token verify ngẫu nhiên
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const doc = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      department: dto.department ? dto.department.toUpperCase() : undefined,
      phoneNumber: dto.phoneNumber,
      roles,
      isVerified: false, // [MỚI] Mặc định chưa active
      verificationToken, // [MỚI] Lưu token
    });

    // [MỚI] Gửi email xác nhận
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:5173';
    const link = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      await this.mailerService.sendMail({
        to: doc.email,
        subject: '[Hệ thống] Xác nhận đăng ký tài khoản',
        html: `
          <h3>Xin chào ${doc.name},</h3>
          <p>Bạn vừa đăng ký tài khoản. Vui lòng click vào link dưới đây để kích hoạt:</p>
          <a href="${link}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">XÁC NHẬN NGAY</a>
          <p>Link này chỉ có hiệu lực một lần.</p>
        `,
      });
      console.log(`Verification email sent to ${doc.email}`);
    } catch (e) {
      console.error('Error sending verification email:', e);
      // Không throw lỗi để tránh rollback user nếu chỉ lỗi mail server
    }

    return doc;
  }

  // [MỚI] Hàm xử lý xác thực khi user click link
  async verifyUser(token: string) {
    const user = await this.userModel.findOne({ verificationToken: token });
    
    if (!user) {
      throw new BadRequestException('Mã xác thực không hợp lệ hoặc đã hết hạn.');
    }

    user.isVerified = true;
    user.verificationToken = undefined; // Xóa token đi sau khi dùng
    await user.save();

    return { message: 'Xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.' };
  }

  async getProfile(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid ID');
    const user = await this.userModel.findById(id).select('-password').lean().exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
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

    // 1. Cập nhật thông tin cơ bản
    if (dto.name) user.name = dto.name;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    
    if (dto.department) {
      user.department = dto.department.toUpperCase();
    }

    // 2. Xử lý Logic Role Manager
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