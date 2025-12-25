import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link không hợp lệ (thiếu token).');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }
    setStatus('loading');
    try {
      await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Lỗi đặt lại mật khẩu.');
    }
  };

  if (status === 'success') {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-success">
          <h4>Mật khẩu đã được thay đổi thành công!</h4>
          <p>Đang chuyển hướng về trang đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h3 className="text-center mb-4">Đặt lại mật khẩu</h3>
              {status === 'error' && <div className="alert alert-danger">{message}</div>}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu mới</label>
                  <input type="password" className="form-control" required 
                    value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Xác nhận mật khẩu</label>
                  <input type="password" className="form-control" required 
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary w-100" disabled={status === 'loading' || !token}>
                   {status === 'loading' ? 'Đang xử lý...' : 'Đổi mật khẩu'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}