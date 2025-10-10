import { ConflictException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';
import { Role, User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async findByEmail(email: string) {
    return this.userModel
      .findOne({ email })
      .lean<User & { _id: Types.ObjectId } | null>();
  }

  async findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel
      .findById(id)
      .lean<User & { _id: Types.ObjectId } | null>();
  }

  async createByAdmin(dto: CreateUserDto) {
    const exists = await this.userModel.exists({ email: dto.email });
    if (exists) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const roles: Role[] = dto.roles?.length ? dto.roles : [Role.USER];

    const doc = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      password: passwordHash,
      roles,
    });

    const obj = doc.toObject() as User & {
      _id: Types.ObjectId;
      password?: string;
    };
    const { password, ...rest } = obj; // loại password
    return { ...rest, _id: rest._id.toString() };
  }
}
