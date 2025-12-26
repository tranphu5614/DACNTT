import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api'; // Axios instance của bạn

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    
    try {
      await api.post('/auth/forgot-password', { email });
      setStatus('success');
      setMessage('Chúng tôi đã gửi link đặt lại mật khẩu vào email của bạn. Vui lòng kiểm tra hộp thư đến (và cả mục Spam).');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Không tìm thấy email này trong hệ thống.');
    }
  };

  // --- UI KHI GỬI THÀNH CÔNG ---
  if (status === 'success') {
    return (
      <div className="o_form_sheet shadow-lg p-5 mx-auto text-center" style={{ maxWidth: '500px', borderRadius: '16px' }}>
        <div className="mb-4 text-success">
           <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem', color: '#008784' }}></i>
        </div>
        <h3 className="fw-bold text-dark mb-3">Đã Gửi Yêu Cầu!</h3>
        <p className="text-muted mb-4">{message}</p>
        
        <Link to="/login" className="btn btn-primary w-100 py-3 fw-bold text-uppercase shadow-sm" style={{ backgroundColor: '#008784', borderColor: '#008784' }}>
           <i className="bi bi-arrow-left me-2"></i> Quay lại Đăng nhập
        </Link>
      </div>
    );
  }

  // --- UI FORM NHẬP EMAIL ---
  return (
    <div className="o_form_sheet shadow-lg p-5 mx-auto" style={{ maxWidth: '500px', borderRadius: '16px' }}>
      
      {/* 1. Header & Icon */}
      <div className="text-center mb-5">
        <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-4 shadow-sm" 
             style={{ width: '80px', height: '80px' }}>
            <i className="bi bi-shield-lock-fill fs-1" style={{ color: '#008784' }}></i>
        </div>
        <h3 className="fw-bold text-dark">Quên Mật Khẩu?</h3>
        <p className="text-muted small">
          Đừng lo, hãy nhập email công ty để nhận hướng dẫn.
        </p>
      </div>

      {/* 2. Error Alert */}
      {status === 'error' && (
        <div className="alert alert-danger d-flex align-items-center small py-2 mb-4 shadow-sm" role="alert">
          <i className="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
          <div>{message}</div>
        </div>
      )}

      {/* 3. Form */}
      <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
        <div>
          <label className="form-label fw-bold text-secondary small text-uppercase mb-2">Email Đăng Ký</label>
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0 text-muted ps-3">
                <i className="bi bi-envelope fs-5"></i>
            </span>
            <input
              type="email"
              className="form-control border-start-0 bg-light"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nhanvien@company.com"
              style={{ height: '50px', fontSize: '1rem' }}
              autoFocus
              disabled={status === 'loading'}
            />
          </div>
        </div>

        <button 
          type="submit" 
          className="btn btn-primary w-100 py-3 mt-3 fw-bold text-uppercase shadow-sm" 
          disabled={status === 'loading'}
          style={{ backgroundColor: '#008784', borderColor: '#008784', letterSpacing: '0.5px' }}
        >
          {status === 'loading' ? (
             <>
               <span className="spinner-border spinner-border-sm me-2"></span>
               Đang gửi...
             </>
          ) : 'Gửi Yêu Cầu'}
        </button>
      </form>

      {/* 4. Footer Link */}
      <div className="text-center mt-4 pt-3 border-top">
         <Link to="/login" className="text-decoration-none fw-bold d-inline-flex align-items-center" style={{ color: '#008784' }}>
            <i className="bi bi-arrow-left me-2"></i> Quay lại đăng nhập
         </Link>
      </div>

    </div>
  );
}