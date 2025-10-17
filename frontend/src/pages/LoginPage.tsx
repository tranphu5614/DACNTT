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
      setErr(e?.message || 'Login failed');
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="card-title mb-1">Welcome back</h4>
        <p className="text-secondary">Đăng nhập để tiếp tục</p>

        {err && <div className="alert alert-danger">{err}</div>}

        <form onSubmit={onSubmit} className="row g-3">
          <div className="col-12">
            <label className="form-label">Email</label>
            <input
              className="form-control"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="col-12">
            <label className="form-label">Password</label>
            <input
              className="form-control"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          <div className="col-12 d-grid">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
