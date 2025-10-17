import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, User, UserDocument } from './schemas/user.schema';
import type { FilterQuery } from 'mongoose';
import { ListUsersQueryDto } from './dto/list-users.query';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string) {
    return this.userModel.findOne({ email }).lean<User>().exec();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id).lean<User>().exec();
  }

  async createByAdmin(dto: CreateUserDto) {
    const exists = await this.userModel.exists({ email: dto.email });
    if (exists) throw new ConflictException('Email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Chuẩn hoá roles về enum (đề phòng DTO chưa convert)
    const roles: Role[] =
      (dto.roles ?? [Role.USER]).map((v: any) => String(v).toUpperCase() as Role);

    const doc = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      roles,
    });

    const obj = doc.toObject() as User & { _id: Types.ObjectId; password?: string };
    const { password, ...rest } = obj;
    return { ...rest, _id: rest._id.toString() };
  }

  async deleteById(id: string, currentUserId?: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid user id');
    }
    if (currentUserId && String(currentUserId) === String(id)) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const target = await this.userModel
      .findById(id)
      .select('_id roles')
      .lean<{ _id: Types.ObjectId; roles: string[] }>();
    if (!target) throw new NotFoundException('User not found');

    // Chặn xoá ADMIN cuối cùng
    const isAdmin = (target.roles || [])
      .map((r) => String(r).toUpperCase())
      .includes('ADMIN');
    if (isAdmin) {
      const otherAdmins = await this.userModel.countDocuments({
        _id: { $ne: id },
        roles: { $regex: /^ADMIN$/i },
      });
      if (otherAdmins === 0) {
        throw new ForbiddenException('Cannot delete the last ADMIN');
      }
    }

    await this.userModel.deleteOne({ _id: id });
    return { deleted: true };
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
      this.userModel
        .find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(filter),
    ]);

    return { items, total, page, limit };
  }
}
