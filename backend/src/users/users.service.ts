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
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto'; // [MỚI] Import DTO
import { Role, User, UserDocument } from './schemas/user.schema';
import { ListUsersQueryDto } from './dto/list-users.query';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  // =================================================================
  // 1. PUBLIC & AUTH METHODS
  // =================================================================

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).exec();
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userModel.exists({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const roles: Role[] = dto.roles 
      ? dto.roles.map((v: any) => String(v).toUpperCase() as Role)
      : [Role.USER];

    const doc = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      department: dto.department ? dto.department.toUpperCase() : undefined,
      phoneNumber: dto.phoneNumber,
      roles,
    });

    return doc;
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
  // 3. ADMIN METHODS (Quản lý User)
  // =================================================================

  // [MỚI - QUAN TRỌNG] Hàm Update tổng hợp: Sửa Info + Tự động chỉnh Role
  async update(id: string, dto: UpdateUserDto) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid ID');
    
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    // 1. Cập nhật thông tin cơ bản
    if (dto.name) user.name = dto.name;
    if (dto.phoneNumber !== undefined) user.phoneNumber = dto.phoneNumber;
    
    // Nếu đổi phòng ban, cập nhật và chuẩn hóa
    if (dto.department) {
      user.department = dto.department.toUpperCase();
    }

    // 2. Xử lý Logic Role Manager (Nếu có gửi field isManager)
    if (dto.isManager !== undefined) {
      const dept = user.department; // Lấy phòng ban (mới hoặc cũ)
      
      // Lọc bỏ tất cả role quản lý cũ để tránh trùng lặp/sai lệch
      // Giữ lại ADMIN và USER, xóa MANAGER, IT_MANAGER, HR_MANAGER...
      let roles = user.roles.filter(r => 
        r !== Role.MANAGER && 
        !r.endsWith('_MANAGER') // Xóa các role kết thúc bằng _MANAGER
      );

      // Nếu được tick làm quản lý
      if (dto.isManager && dept) {
        roles.push(Role.MANAGER); // Role chung
        const specificRole = `${dept}_MANAGER`;
        
        // Thêm role cụ thể (IT_MANAGER...)
        // Dùng 'as Role' để ép kiểu
        if (!roles.includes(specificRole as Role)) {
          roles.push(specificRole as Role);
        }
      }

      user.roles = roles;
    }

    return user.save();
  }

  // Hàm cũ (Giữ lại để tương thích nếu cần, nhưng hàm update ở trên đã bao gồm logic này)
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