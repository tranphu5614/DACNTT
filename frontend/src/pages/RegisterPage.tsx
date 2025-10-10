import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const [name, setName] = useState('Alice');
  const [email, setEmail] = useState(`alice${Date.now()}@test.com`);
  const [password, setPassword] = useState('Password123!');
  const [err, setErr] = useState('');
  const nav = useNavigate();

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await register(name, email, password);
      nav('/', { replace: true });
    } catch (e: any) {
      setErr(e.message || 'Register failed');
    }
  };

  return (
    <div className="center">
      <form className="card" onSubmit={onSubmit}>
        <h2>Register</h2>
        <label>Name</label>
        <input value={name} onChange={e=>setName(e.target.value)} required />
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        {err && <div className="error">{err}</div>}
        <button type="submit" disabled={loading}>{loading ? '...' : 'Create account'}</button>
        <p className="muted">Tip: đổi email nếu báo “Email đã tồn tại”.</p>
      </form>
    </div>
  );
}
