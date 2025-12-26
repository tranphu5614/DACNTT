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
      setMessage('Invalid link or link has expired (missing token).');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus('error'); // Use error status for prettier notification than alert
      setMessage('Password confirmation does not match.');
      return;
    }
    if (password.length < 6) {
      setStatus('error');
      setMessage('Password must be at least 6 characters long.');
      return;
    }

    setStatus('loading');
    try {
      await api.post('/auth/reset-password', { token, password });
      setStatus('success');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.response?.data?.message || 'Error resetting password. The token may have expired.');
    }
  };

  // --- SUCCESS CASE ---
  if (status === 'success') {
    return (
      <div className="d-flex flex-column min-vh-100 justify-content-center align-items-center bg-light">
        <div className="card border-0 shadow-sm text-center p-5" style={{maxWidth: 400, width: '100%'}}>
            <div className="mb-4 text-success">
                <i className="bi bi-check-circle-fill" style={{fontSize: '4rem'}}></i>
            </div>
            <h4 className="fw-bold text-dark mb-3">Password Changed!</h4>
            <p className="text-muted mb-4">Your password has been updated. You will be redirected to the login page momentarily...</p>
            <Link to="/login" className="btn btn-primary w-100" style={{backgroundColor: '#008784', borderColor: '#008784'}}>
                Login Now
            </Link>
        </div>
      </div>
    );
  }

  // --- MAIN FORM ---
  return (
    <div className="d-flex flex-column min-vh-100 justify-content-center align-items-center bg-light px-3">


      <div className="card border-0 shadow-sm w-100" style={{maxWidth: 400}}>
        <div className="card-body p-4 p-md-5">
          
          <div className="text-center mb-4">
              <h5 className="fw-bold text-dark">Reset Password</h5>
              <p className="text-muted small">Please enter a new password for your account.</p>
          </div>

          {status === 'error' && (
              <div className="alert alert-danger d-flex align-items-center small mb-4" role="alert">
                  <i className="bi bi-exclamation-triangle-fill me-2"></i>
                  <div>{message}</div>
              </div>
          )}
          
          <form onSubmit={handleSubmit}>
            
            {/* New Password */}
            <div className="mb-3">
              <label className="form-label small fw-bold text-secondary text-uppercase">New Password</label>
              <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-lock"></i></span>
                  <input 
                    type={showPass ? "text" : "password"} 
                    className="form-control border-start-0 border-end-0" 
                    placeholder="Min 6 chars"
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

            {/* Confirm Password */}
            <div className="mb-4">
              <label className="form-label small fw-bold text-secondary text-uppercase">Confirm Password</label>
              <div className="input-group">
                  <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-shield-check"></i></span>
                  <input 
                    type={showPass ? "text" : "password"}
                    className="form-control border-start-0" 
                    placeholder="Re-enter new password"
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
                        Processing...
                    </>
                ) : 'Change Password'}
            </button>

            <div className="text-center">
                <Link to="/login" className="text-decoration-none small text-muted hover-text-primary">
                    <i className="bi bi-arrow-left me-1"></i> Back to Login
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