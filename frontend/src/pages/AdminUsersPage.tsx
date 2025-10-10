import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCreateUser } from '../api/users';

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rolesStr, setRolesStr] = useState('user'); // mặc định user
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');

    // cắt trắng & đảm bảo là string
    const payload = {
      name: String(name).trim(),
      email: String(email).trim(),
      password: String(password),
      roles: rolesStr
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean),
    };

    if (!payload.name) {
      setErr('Tên không được để trống');
      return;
    }
    if (!token) {
      setErr('Chưa có token admin');
      return;
    }

    try {
      setLoading(true);
      await apiCreateUser(token, payload);
      setMsg('Tạo user thành công!');
      // clear form
      setName('');
      setEmail('');
      setPassword('');
      setRolesStr('user');
    } catch (e: any) {
      setErr(e?.message || 'Tạo user thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Quản trị: Tạo nhân viên</h1>

      {msg && <div className="callout success">{msg}</div>}
      {err && <div className="error">{err}</div>}

      <form onSubmit={handleSubmit} style={{ maxWidth: 520 }}>
        <div className="form-group">
          <label>Tên</label>
          <input
            type="text"
            value={name}
            placeholder="Nguyễn Văn A"
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            placeholder="a@company.com"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Mật khẩu</label>
          <input
            type="password"
            value={password}
            placeholder=">= 6 ký tự"
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </div>

        <div className="form-group">
          <label>Roles (phân cách bằng dấu phẩy)</label>
          <input
            type="text"
            value={rolesStr}
            placeholder="user, it_manager, hr_manager, admin"
            onChange={(e) => setRolesStr(e.target.value)}
          />
          <small>Giá trị hợp lệ: <code>user</code>, <code>admin</code>, <code>it_manager</code>, <code>hr_manager</code></small>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Đang tạo…' : 'Tạo user'}
        </button>
      </form>
    </div>
  );
}
