// frontend/src/pages/VerifyEmailPage.tsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios'; // Hoặc dùng api instance của bạn
// Import file cấu hình API nếu cần, ví dụ: import api from '../utils/api';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Nếu không có token, báo lỗi ngay
  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link không hợp lệ (thiếu token).');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      alert('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      alert('Mật khẩu xác nhận không khớp');
      return;
    }

    setStatus('loading');
    try {
      // Gọi API activate mới đã sửa ở Backend
      // Lưu ý: Đảm bảo URL backend đúng (vd: http://localhost:3000/auth/activate)
      // Bạn nên dùng instance axios đã cấu hình sẵn base URL
      await axios.post('http://localhost:3000/auth/activate', { 
        token, 
        password 
      });

      setStatus('success');
      setMessage('Kích hoạt thành công! Đang chuyển hướng đăng nhập...');
      
      // Chuyển hướng sau 2 giây
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt.');
    }
  };

  if (status === 'success') {
    return (
      <div className="container py-5 text-center">
        <div className="alert alert-success">
           <h4>{message}</h4>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow-sm">
            <div className="card-body p-4">
              <h3 className="card-title text-center mb-4">Kích hoạt tài khoản</h3>
              
              {status === 'error' && (
                <div className="alert alert-danger">{message}</div>
              )}

              <p className="text-muted text-center mb-4">
                Vui lòng thiết lập mật khẩu để hoàn tất đăng ký.
              </p>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Mật khẩu mới</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Nhập mật khẩu của bạn"
                  />
                </div>

                <div className="mb-4">
                  <label className="form-label">Xác nhận mật khẩu</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu"
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary w-100"
                  disabled={status === 'loading' || !token}
                >
                  {status === 'loading' ? 'Đang xử lý...' : 'Xác nhận & Đăng nhập'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}