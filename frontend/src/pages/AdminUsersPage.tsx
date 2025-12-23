import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCreateUser } from '../api/users';

export default function AdminUsersPage() {
  const { token } = useAuth();
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('IT'); // Mặc định là IT

  // UI State
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      setLoading(true);
      
      // Gọi API tạo user với cấu trúc mới
      await apiCreateUser(token!, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phoneNumber.trim(),
        department,
        // roles: Không gửi roles, Backend tự set là USER
      });

      setMsg('Tạo nhân viên thành công!');
      // Reset form
      setName(''); 
      setEmail(''); 
      setPassword(''); 
      setPhoneNumber('');
      setDepartment('IT');
      
    } catch (e: any) {
      setErr(e?.message || 'Tạo thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="card-title mb-3">Thêm nhân viên mới</h4>

        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-danger">{err}</div>}

        <form onSubmit={onSubmit} className="row g-3">
          {/* Hàng 1: Tên & Email */}
          <div className="col-md-6">
            <label className="form-label">Họ tên <span className="text-danger">*</span></label>
            <input 
              className="form-control" 
              placeholder="Nguyễn Văn A" 
              value={name}
              onChange={(e) => setName(e.target.value)} 
              required 
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email <span className="text-danger">*</span></label>
            <input 
              className="form-control" 
              type="email" 
              placeholder="email@company.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>

          {/* Hàng 2: Mật khẩu & SĐT */}
          <div className="col-md-6">
            <label className="form-label">Mật khẩu <span className="text-danger">*</span></label>
            <input 
              className="form-control" 
              type="password" 
              placeholder="Tối thiểu 6 ký tự"
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              minLength={6} 
              required 
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Số điện thoại</label>
            <input 
              className="form-control" 
              type="text" 
              placeholder="09xx..."
              value={phoneNumber} 
              onChange={(e) => setPhoneNumber(e.target.value)} 
            />
          </div>

          {/* Hàng 3: Phòng ban */}
          <div className="col-md-12">
            <label className="form-label">Phòng ban <span className="text-danger">*</span></label>
            <select 
              className="form-select" 
              value={department} 
              onChange={(e) => setDepartment(e.target.value)}
            >
              <option value="IT">IT (Công nghệ thông tin)</option>
              <option value="HR">HR (Nhân sự)</option>
              <option value="SALES">Sales (Kinh doanh)</option>
              <option value="ACCOUNTING">Kế toán</option>
              <option value="OTHER">Khác</option>
            </select>
            <div className="form-text text-muted">
              <i className="bi bi-info-circle me-1"></i>
              Nhân viên mới sẽ có quyền <strong>USER</strong>. Để cấp quyền Quản lý, vui lòng vào trang chi tiết sau khi tạo.
            </div>
          </div>

          <div className="col-12 d-grid mt-4">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang xử lý...' : 'Tạo nhân viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}