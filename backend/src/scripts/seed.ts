import 'reflect-metadata';
import * as dotenv from 'dotenv';
dotenv.config();
import * as bcrypt from 'bcrypt';
import mongoose from 'mongoose';

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/company_requests';
  await mongoose.connect(MONGO_URI);

  const userSchema = new mongoose.Schema({
    email: { type: String, unique: true, required: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    password: { type: String, required: true },
    roles: { type: [String], required: true }
  });

  const User = mongoose.model('User', userSchema);

  const users = [
    { email: process.env.ADMIN_EMAIL || 'admin@example.com', name: 'System Admin', roles: ['ADMIN'], password: process.env.ADMIN_PASSWORD || 'Admin@123' },
    { email: 'hr@example.com', name: 'HR Manager', roles: ['HR_MANAGER'], password: 'Hr@123456' },
    { email: 'it@example.com', name: 'IT Manager', roles: ['IT_MANAGER'], password: 'It@123456' },
    { email: 'emp@example.com', name: 'Employee', roles: ['EMPLOYEE'], password: 'Emp@123456' },
  ];

  for (const u of users) {
    const existed = await User.findOne({ email: u.email });
    if (existed) { console.log('Existed:', u.email); continue; }
    const hashed = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, password: hashed });
    console.log('Created:', u.email, u.roles);
  }

  await mongoose.disconnect();
  console.log('✅ Seed done');
}

seed().catch(e => { console.error(e); process.exit(1); });
