import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, Role } from './user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async create(data: { email: string; name: string; password: string; roles?: Role[] }) {
    const hashed = await bcrypt.hash(data.password, 10);
    const doc = new this.userModel({ ...data, password: hashed });
    await doc.save();
    const obj = doc.toObject();
    delete (obj as any).password; // vì select:false nhưng xoá cho chắc
    return obj;
  }

  async findByEmail(email: string, includePassword = false): Promise<UserDocument | null> {
    const q = this.userModel.findOne({ email });
    return includePassword ? q.select('+password').exec() : q.exec();
  }

  async findById(id: string) {
    return this.userModel.findById(id).exec();
  }

  async updateRoles(id: string, roles: Role[]) {
    return this.userModel.findByIdAndUpdate(id, { roles }, { new: true }).exec();
  }
}
