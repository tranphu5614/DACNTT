import 'dotenv/config';
import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';

// Định nghĩa schema đơn giản giống với UserSchema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  // Đảm bảo default role cũng là chữ in hoa nếu có
  roles: { type: [String], default: ['USER'] },
}, { timestamps: true });

// Đảm bảo URI database khớp với trong app.module.ts (reqsys)
const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/reqsys';

async function main() {
  console.log('Connecting to MongoDB at', uri);
  await mongoose.connect(uri);
  const User = mongoose.model('User', UserSchema);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPass  = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

  const existed = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existed) {
    console.log('Admin existed:', adminEmail);
    // Tự động sửa role nếu admin cũ bị sai (ví dụ đang là 'admin' thường)
    const currentRoles = existed.roles.map((r: string) => r.toUpperCase());
    if (!currentRoles.includes('ADMIN')) {
       existed.roles.push('ADMIN');
       await existed.save();
       console.log('-> Đã thêm quyền ADMIN cho tài khoản này.');
    }
  } else {
    const hash = await bcrypt.hash(adminPass, 10);
    await User.create({
      name: 'System Admin',
      email: adminEmail.toLowerCase(),
      password: hash,
      roles: ['ADMIN'], // 👈 QUAN TRỌNG: Phải là 'ADMIN' in hoa
    });
    console.log('Seeded admin:', adminEmail, 'password:', adminPass);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});