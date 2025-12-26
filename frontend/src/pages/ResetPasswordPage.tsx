import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link không hợp lệ hoặc đã hết hạn (thiếu token).');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error'); // Dùng status error để hiện thông báo đẹp hơn alert
      setMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setStatus('loading');
    try {
      await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Lỗi đặt lại mật khẩu. Token có thể đã hết hạn.');
    }
  };

  // --- TRƯỜNG HỢP THÀNH CÔNG ---
  if (status === 'success') {
    return (
      <div className="d-flex flex-column min-vh-100 justify-content-center align-items-center bg-light">
        <div className="card border-0 shadow-sm text-center p-5" style={{maxWidth: 400, width: '100%'}}>
            <div className="mb-4 text-success">
                <i className="bi bi-check-circle-fill" style={{fontSize: '4rem'}}></i>
            </div>
            <h4 className="fw-bold text-dark mb-3">Đổi mật khẩu thành công!</h4>
            <p className="text-muted mb-4">Mật khẩu của bạn đã được cập nhật. Bạn sẽ được chuyển hướng về trang đăng nhập trong giây lát...</p>
            <Link to="/login" className="btn btn-primary w-100" style={{backgroundColor: '#008784', borderColor: '#008784'}}>
                Đăng nhập ngay
            </Link>
        </div>
      </div>
    );
  }

  // --- FORM CHÍNH ---
  return (
    <div className="d-flex flex-column min-vh-100 justify-content-center align-items-center bg-light px-3">


      <div className="card border-0 shadow-sm w-100" style={{maxWidth: 400}}>
        <div className="card-body p-4 p-md-5">
          
          <div className="text-center mb-4">
              <h5 className="fw-bold text-dark">Đặt lại mật khẩu</h5>
              <p className="text-muted small">Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</p>
          </div>

          {status === 'error' && (
              <div className="alert alert-danger d-flex align-items-center small mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>{message}</div>
              </div>
          )}
          
          <form onSubmit={handleSubmit}>
            
            {/* Mật khẩu mới */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary text-uppercase">Mật khẩu mới</label>
              <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-lock"></i></span>
                  <input 
                    type={showPass ? "text" : "password"} 
                    className="form-control border-start-0 border-end-0" 
                    placeholder="Tối thiểu 6 ký tự"
                    required 
                    minLength={6}
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                  />
                  <button 
                      type="button"
                      className="btn btn-outline-secondary border-start-0 border-light bg-white text-muted pe-3"
                      onClick={() => setShowPass(!showPass)}
                  >
                      <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary text-uppercase">Xác nhận mật khẩu</label>
              <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-shield-check"></i></span>
                  <input 
                    type={showPass ? "text" : "password"}
                    className="form-control border-start-0" 
                    placeholder="Nhập lại mật khẩu mới"
                    required 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                  />
              </div>
            </div>

            <button 
                type="submit" 
                className="btn btn-primary w-100 fw-bold py-2 mb-3" 
                disabled={status === 'loading' || !token}
                style={{ backgroundColor: '#008784', borderColor: '#008784' }}
            >
                {status === 'loading' ? (
                    <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Đang xử lý...
                    </>
                ) : 'Đổi mật khẩu'}
            </button>

            <div className="text-center">
                <Link to="/login" className="text-decoration-none small text-muted hover-text-primary">
                    <i className="bi bi-arrow-left me-1"></i> Quay lại đăng nhập
                </Link>
            </div>

          </form>
        </div>
      </div>

      {/* Footer Text */}
      <div className="mt-4 text-muted small text-center opacity-75">
          &copy; {new Date().getFullYear()} Internal Portal System
      </div>

    </div>
  );
}