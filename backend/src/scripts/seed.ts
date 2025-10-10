import 'dotenv/config';
import mongoose from 'mongoose';
import { Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';

// Định nghĩa schema đơn giản giống với UserSchema
const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  roles: { type: [String], default: ['user'] },
}, { timestamps: true });

const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/irs_db';

async function main() {
  await mongoose.connect(uri);
  const User = mongoose.model('User', UserSchema);

  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@company.com';
  const adminPass  = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';

  const existed = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existed) {
    console.log('Admin existed:', adminEmail);
  } else {
    const hash = await bcrypt.hash(adminPass, 10);
    await User.create({
      name: 'System Admin',
      email: adminEmail.toLowerCase(),
      password: hash,
      roles: ['admin'],
    });
    console.log('Seeded admin:', adminEmail, 'password:', adminPass);
  }

  await mongoose.disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
