import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios'; 

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Đường dẫn kích hoạt không hợp lệ hoặc đã hết hạn.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setStatus('error');
      setMessage('Mật khẩu quá ngắn. Vui lòng nhập tối thiểu 6 ký tự.');
      return;
    }
    if (password !== confirmPassword) {
      setStatus('error');
      setMessage('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      await axios.post('http://localhost:3000/auth/activate', { token, password });
      setStatus('success');
      setMessage('Tài khoản đã được kích hoạt thành công!');
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    }
  };

  // --- UI THÀNH CÔNG (Nhỏ gọn) ---
  if (status === 'success') {
    return (
      <div className="d-flex align-items-center justify-content-center min-vh-100" style={{ backgroundColor: 'var(--odoo-bg)' }}>
        <div className="o_form_sheet shadow-lg p-4 text-center" style={{ maxWidth: '400px', width: '90%', borderRadius: '12px' }}>
            <div className="mb-3 text-success">
               <i className="bi bi-check-circle-fill" style={{ fontSize: '3.5rem', color: '#008784' }}></i>
            </div>
            <h4 className="fw-bold text-dark mb-2">Hoàn Tất!</h4>
            <p className="text-muted small mb-3">{message}</p>
            <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
        </div>
      </div>
    );
  }

  // --- UI FORM CHÍNH (Căn giữa & Nhỏ gọn) ---
  return (
    // 1. Container cha: Căn giữa tuyệt đối (dọc + ngang)
    <div className="min-vh-100 d-flex align-items-center justify-content-center p-3" style={{ backgroundColor: 'var(--odoo-bg)' }}>
      
      {/* 2. Card: Giảm maxWidth xuống 420px và padding p-4 */}
      <div className="o_form_sheet shadow-lg p-4 w-100" style={{ maxWidth: '420px', borderRadius: '12px' }}>
        
        {/* Header nhỏ gọn hơn */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-3 shadow-sm" 
               style={{ width: '64px', height: '64px' }}> {/* Icon nhỏ hơn */}
              <i className="bi bi-person-check-fill fs-2" style={{ color: '#008784' }}></i>
          </div>
          <h4 className="fw-bold text-dark mb-1">Kích Hoạt Tài Khoản</h4>
          <p className="text-muted small mb-0">Thiết lập mật khẩu để bắt đầu.</p>
        </div>

        {status === 'error' && (
          <div className="alert alert-danger d-flex align-items-center small py-2 mb-3 shadow-sm" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-2"></i>
            <div>{message}</div>
          </div>
        )}

        {token ? (
          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
            
            {/* Mật khẩu mới */}
            <div>
              <label className="form-label fw-bold text-secondary small text-uppercase mb-1" style={{fontSize: '0.75rem'}}>Mật khẩu mới</label>
              <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted ps-3">
                      <i className="bi bi-lock"></i>
                  </span>
                  <input
                      type={showPass ? "text" : "password"}
                      className="form-control border-start-0 border-end-0 bg-light"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      placeholder="Min 6 ký tự"
                      style={{ height: '46px', fontSize: '0.95rem' }} // Giảm chiều cao chút
                      disabled={status === 'loading'}
                  />
                  <button 
                      type="button"
                      className="btn btn-outline-secondary border-start-0 border-light bg-light text-muted pe-3"
                      onClick={() => setShowPass(!showPass)}
                  >
                      <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="form-label fw-bold text-secondary small text-uppercase mb-1" style={{fontSize: '0.75rem'}}>Nhập lại mật khẩu</label>
              <div className="input-group">
                  <span className="input-group-text bg-light border-end-0 text-muted ps-3">
                      <i className="bi bi-shield-lock"></i>
                  </span>
                  <input
                      type={showConfirmPass ? "text" : "password"}
                      className="form-control border-start-0 border-end-0 bg-light"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Xác nhận lại"
                      style={{ height: '46px', fontSize: '0.95rem' }}
                      disabled={status === 'loading'}
                  />
                  <button 
                      type="button"
                      className="btn btn-outline-secondary border-start-0 border-light bg-light text-muted pe-3"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                  >
                      <i className={`bi ${showConfirmPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                  </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary w-100 py-2 mt-2 fw-bold text-uppercase shadow-sm"
              disabled={status === 'loading'}
              style={{ backgroundColor: '#008784', borderColor: '#008784', letterSpacing: '0.5px', height: '46px' }}
            >
              {status === 'loading' ? 'Đang xử lý...' : 'Xác nhận'}
            </button>
          </form>
        ) : (
           <div className="text-center">
              <Link to="/login" className="btn btn-outline-primary w-100 py-2 fw-bold" style={{ color: '#008784', borderColor: '#008784' }}>
                  Quay về trang đăng nhập
              </Link>
           </div>
        )}

        {token && (
          <div className="text-center mt-3 pt-3 border-top">
              <span className="text-muted small" style={{fontSize: '0.85rem'}}>Đã có tài khoản? </span>
              <Link to="/login" className="fw-bold text-decoration-none ms-1 small" style={{ color: '#008784' }}>
                  Đăng nhập
              </Link>
          </div>
        )}

      </div>
    </div>
  );
}