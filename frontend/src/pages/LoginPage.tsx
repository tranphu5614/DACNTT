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
      const to = loc.state?.from?.pathname || '/';
      nav(to, { replace: true });
    } catch (e: any) {
      setErr(e.message || 'Login failed');
    }
  };

  return (
    <div className="center">
      <form className="card" onSubmit={onSubmit}>
        <h2>Login</h2>
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        {err && <div className="error">{err}</div>}
        <button type="submit" disabled={loading}>{loading ? '...' : 'Login'}</button>
        <p className="muted"></p>
      </form>
    </div>
  );
}
