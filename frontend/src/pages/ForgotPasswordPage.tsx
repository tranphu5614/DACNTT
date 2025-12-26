import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api'; // Your Axios instance

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
      setMessage('We have sent a password reset link to your email. Please check your inbox (and Spam folder).');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Email not found in the system.');
    }
  };

  // --- UI ON SUCCESS ---
  if (status === 'success') {
    return (
      <div className="o_form_sheet shadow-lg p-5 mx-auto text-center" style={{ maxWidth: '500px', borderRadius: '16px' }}>
        <div className="mb-4 text-success">
           <i className="bi bi-check-circle-fill" style={{ fontSize: '4rem', color: '#008784' }}></i>
        </div>
        <h3 className="fw-bold text-dark mb-3">Request Sent!</h3>
        <p className="text-muted mb-4">{message}</p>
        
        <Link to="/login" className="btn btn-primary w-100 py-3 fw-bold text-uppercase shadow-sm" style={{ backgroundColor: '#008784', borderColor: '#008784' }}>
           <i className="bi bi-arrow-left me-2"></i> Back to Login
        </Link>
      </div>
    );
  }

  // --- UI FORM INPUT EMAIL ---
  return (
    <div className="o_form_sheet shadow-lg p-5 mx-auto" style={{ maxWidth: '500px', borderRadius: '16px' }}>
      
      {/* 1. Header & Icon */}
      <div className="text-center mb-5">
        <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle mb-4 shadow-sm" 
             style={{ width: '80px', height: '80px' }}>
            <i className="bi bi-shield-lock-fill fs-1" style={{ color: '#008784' }}></i>
        </div>
        <h3 className="fw-bold text-dark">Forgot Password?</h3>
        <p className="text-muted small">
          Don't worry, enter your company email to receive instructions.
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
          <label className="form-label fw-bold text-secondary small text-uppercase mb-2">Registered Email</label>
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
              placeholder="employee@company.com"
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
               Sending...
             </>
          ) : 'Send Request'}
        </button>
      </form>

      {/* 4. Footer Link */}
      <div className="text-center mt-4 pt-3 border-top">
         <Link to="/login" className="text-decoration-none fw-bold d-inline-flex align-items-center" style={{ color: '#008784' }}>
            <i className="bi bi-arrow-left me-2"></i> Back to login
         </Link>
      </div>

    </div>
  );
}