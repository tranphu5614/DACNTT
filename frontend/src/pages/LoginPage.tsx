import { FormEvent, useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState('');
  
  const nav = useNavigate();
  const loc = useLocation() as any;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErr('');
    try {
      await login(email, password);
      const to = loc?.state?.from?.pathname || '/profile';
      nav(to, { replace: true });
    } catch (e: any) {
      setErr(e?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="o_form_sheet shadow-lg mx-auto overflow-hidden p-0" style={{ maxWidth: '900px', borderRadius: '16px' }}>
      
      <div className="row g-0">
        
        {/* LEFT COLUMN: Branding */}
        <div className="col-md-5 d-none d-md-flex flex-column align-items-center justify-content-center p-5 text-white" 
             style={{ 
                 backgroundColor: '#008784',  // Hardcoded Teal
                 background: 'linear-gradient(135deg, #008784 0%, #006e6b 100%)' 
             }}>
          
          <div className="bg-white rounded-circle d-flex align-items-center justify-content-center mb-4 shadow-sm" 
               style={{ width: '100px', height: '100px' }}>
             {/* Icon keeps the teal color */}
             <i className="bi bi-buildings-fill display-4" style={{ color: '#008784' }}></i>
          </div>
          
          <h3 className="fw-bold mb-2 text-white">Internal Portal</h3>
          <p className="text-white-50 text-center small mb-4 px-3">
            Centralized internal request management and workflow system.
          </p>
          
          <div className="mt-auto opacity-50 small text-white">
            &copy; 2024 IT Department
          </div>
        </div>

        {/* RIGHT COLUMN: Login Form */}
        <div className="col-md-7 bg-white p-5">
          <div className="d-flex align-items-center justify-content-between mb-4">
             <h4 className="fw-bold text-dark m-0">Login</h4>
             {/* Mobile Logo - Keeps teal color */}
             <i className="bi bi-buildings-fill fs-2 d-md-none" style={{ color: '#008784' }}></i>
          </div>

          {err && (
            <div className="alert alert-danger d-flex align-items-center small py-2 mb-4" role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>{err}</div>
            </div>
          )}

          <form onSubmit={onSubmit} className="d-flex flex-column gap-3">
            {/* Email */}
            <div>
              <label className="form-label fw-bold text-secondary small text-uppercase">Company Email</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="bi bi-envelope"></i>
                </span>
                <input
                  className="form-control border-start-0 bg-light"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                  required
                  style={{ height: '48px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="d-flex justify-content-between align-items-center mb-1">
                 <label className="form-label fw-bold text-secondary small text-uppercase mb-0">Password</label>
              </div>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0 text-muted">
                    <i className="bi bi-lock"></i>
                </span>
                <input
                  className="form-control border-start-0 border-end-0 bg-light"
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                  style={{ height: '48px' }}
                />
                <button 
                   type="button"
                   className="btn btn-outline-secondary border-start-0 border-light bg-light text-muted"
                   onClick={() => setShowPass(!showPass)}
                >
                   <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="d-flex justify-content-between align-items-center mt-2">
               <div className="form-check">
                  <input className="form-check-input" type="checkbox" id="rememberMe" />
                  <label className="form-check-label small text-muted" htmlFor="rememberMe">Remember me</label>
               </div>
               {/* Teal Link */}
               <Link to="/forgot-password" style={{ fontSize: '0.9rem', textDecoration: 'none', color: '#008784' }} className="fw-bold">
                 Forgot Password?
               </Link>
            </div>

            {/* Teal Button */}
            <button 
              className="btn btn-primary w-100 py-3 mt-3 fw-bold text-uppercase shadow-sm" 
              type="submit" 
              disabled={loading}
              style={{ backgroundColor: '#008784', borderColor: '#008784' }}
            >
              {loading ? 'Processing...' : 'Access System'}
            </button>
          </form>

          <div className="text-center mt-4 pt-3 border-top">
             <span className="text-muted small">New employee? </span>
             <Link to="/register" className="fw-bold text-decoration-none ms-1" style={{ color: '#008784' }}>
                Activate Account
             </Link>
          </div>

        </div>
      </div>
    </div>
  );
}