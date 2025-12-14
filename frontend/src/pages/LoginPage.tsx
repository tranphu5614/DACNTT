import { FormEvent, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const nav = useNavigate();
  const loc = useLocation() as any;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');

    try {
      await login(email, password);
      const to = loc?.state?.from?.pathname || '/profile';
      nav(to, { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Đăng nhập thất bại');
    }
  };

  return (
    <div
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '85vh' }}
    >
      <div
        className="card shadow p-4"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 20
        }}
      >
        <div className="card-body">

          {/* TITLE */}
          <h3 className="fw-bold text-center mb-1">Đăng nhập</h3>
          <p className="text-center text-secondary mb-4">
            Chào mừng bạn quay lại hệ thống
          </p>

          {/* ERROR */}
          {err && <div className="alert alert-danger py-2">{err}</div>}

          <form onSubmit={onSubmit} className="row g-3">

            {/* EMAIL */}
            <div className="col-12">
              <label className="form-label fw-semibold">Email</label>

              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="bi bi-envelope-fill text-secondary"></i>
                </span>

                <input
                  type="email"
                  className="form-control"
                  placeholder="admin@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="col-12">
              <label className="form-label fw-semibold">Mật khẩu</label>

              <div className="input-group">
                <span className="input-group-text bg-light">
                  <i className="bi bi-lock-fill text-secondary"></i>
                </span>

                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <div className="col-12 d-grid">
              <button
                className="btn btn-primary btn-lg fw-semibold"
                style={{ borderRadius: 12 }}
                type="submit"
                disabled={loading}
              >
                {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}
