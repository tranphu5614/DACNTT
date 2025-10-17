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
    setChosen((cur) => (cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    try {
      setLoading(true);
      await apiCreateUser(token!, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        roles: chosen,
      });
      setMsg('Tạo user thành công');
      setName(''); setEmail(''); setPassword(''); setChosen(['USER']);
    } catch (e: any) {
      setErr(e?.message || 'Create failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="card-title mb-3">Create user</h4>

        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-danger">{err}</div>}

        <form onSubmit={onSubmit} className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Name</label>
            <input className="form-control" placeholder="Nguyễn Văn A" value={name}
                   onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Email</label>
            <input className="form-control" type="email" placeholder="a.nguyen@company.com" value={email}
                   onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="col-md-6">
            <label className="form-label">Password</label>
            <input className="form-control" type="password" placeholder="Tối thiểu 6 ký tự"
                   value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
          </div>

          <div className="col-12">
            <label className="form-label">Roles</label>
            <div className="d-flex flex-wrap gap-3">
              {ALL_ROLES.map((r) => (
                <div className="form-check" key={r}>
                  <input className="form-check-input" type="checkbox" id={`role-${r}`}
                         checked={chosen.includes(r)} onChange={() => toggleRole(r)} />
                  <label className="form-check-label" htmlFor={`role-${r}`}>{r}</label>
                </div>
              ))}
            </div>
            <div className="form-text">Mặc định sẽ có USER.</div>
          </div>

          <div className="col-12 d-grid">
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang tạo…' : 'Tạo user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
