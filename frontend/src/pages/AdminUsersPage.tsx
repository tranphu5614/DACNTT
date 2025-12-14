import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCreateUser } from '../api/users';

const ALL_ROLES = ['USER', 'ADMIN', 'IT_MANAGER', 'HR_MANAGER'] as const;

export default function AdminUsersPage() {
  const { token } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [chosen, setChosen] = useState<string[]>(['USER']);

  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const toggleRole = (r: string) => {
    setChosen((cur) =>
      cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]
    );
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setErr('');

    try {
      setLoading(true);
      await apiCreateUser(token!, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        roles: chosen
      });

      setMsg('Tạo user thành công!');
      setName('');
      setEmail('');
      setPassword('');
      setChosen(['USER']);
    } catch (e: any) {
      setErr(e?.message || 'Tạo user thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="card shadow-sm"
      style={{ borderRadius: 16 }}
    >
      <div className="card-body">

        {/* Title */}
        <h3 className="fw-bold mb-2">Tạo tài khoản mới</h3>
        <p className="text-secondary mb-4">Điền thông tin bên dưới để tạo user</p>

        {/* Alerts */}
        {msg && <div className="alert alert-success py-2">{msg}</div>}
        {err && <div className="alert alert-danger py-2">{err}</div>}

        <form onSubmit={onSubmit} className="row g-3">

          {/* Name */}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Họ và tên</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-person-fill"></i>
              </span>
              <input
                className="form-control"
                placeholder="Nguyễn Văn A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Email */}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Email</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-envelope-fill"></i>
              </span>
              <input
                className="form-control"
                type="email"
                placeholder="a.nguyen@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="col-md-6">
            <label className="form-label fw-semibold">Mật khẩu</label>
            <div className="input-group">
              <span className="input-group-text bg-light">
                <i className="bi bi-lock-fill"></i>
              </span>
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
          </div>

          {/* Roles */}
          <div className="col-12">
            <label className="form-label fw-semibold">Vai trò</label>

            <div className="d-flex flex-wrap gap-2">

              {ALL_ROLES.map((r) => {
                const active = chosen.includes(r);

                return (
                  <div
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`px-3 py-2 border rounded-pill cursor-pointer
                      ${active ? 'bg-primary text-white' : 'bg-light text-dark'}
                    `}
                    style={{ userSelect: 'none', cursor: 'pointer' }}
                  >
                    {active && <i className="bi bi-check-lg me-1"></i>}
                    {r}
                  </div>
                );
              })}

            </div>

            <div className="form-text mt-1">Mặc định user có role USER.</div>
          </div>

          {/* Submit */}
          <div className="col-12 d-grid">
            <button className="btn btn-primary btn-lg fw-semibold" disabled={loading}>
              {loading ? 'Đang tạo…' : 'Tạo user'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
