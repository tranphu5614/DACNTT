import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api'; // Sử dụng axios instance của bạn

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage('Vui lòng kiểm tra email của bạn để lấy link đặt lại mật khẩu.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Có lỗi xảy ra.');
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h3 className="text-center mb-4">Quên mật khẩu?</h3>
              {status === 'success' ? (
                <div className="alert alert-success">{message}</div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {status === 'error' && <div className="alert alert-danger">{message}</div>}
                  <div className="mb-3">
                    <label className="form-label">Email đăng ký</label>
                    <input
                      type="email"
                      className="form-control"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      placeholder="nhanvien@example.com"
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-100" disabled={status === 'loading'}>
                    {status === 'loading' ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </button>
                </form>
              )}
              <div className="text-center mt-3">
                <Link to="/login">Quay lại đăng nhập</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}