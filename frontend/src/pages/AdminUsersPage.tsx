import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiCreateUser } from '../api/users';
import { Link, useNavigate } from 'react-router-dom';

export default function AdminUsersPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('IT');

  // UI State
  const [msg, setMsg] = useState<string>('');
  const [err, setErr] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(''); setErr('');
    
    try {
      setLoading(true);
      await apiCreateUser(token!, {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phoneNumber: phoneNumber.trim(),
        department,
      });

      setMsg('User profile created successfully!');
      // Reset form
      setName(''); 
      setEmail(''); 
      setPassword(''); 
      setPhoneNumber('');
      setDepartment('IT');
      
    } catch (e: any) {
      setErr(e?.message || 'Could not create user. Please check again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* 1. HEADER (CONTROL PANEL) - Sticky */}
      <div className="border-bottom px-4 py-3 d-flex justify-content-between align-items-center bg-white sticky-top" style={{zIndex: 100}}>
        <div className="d-flex align-items-center gap-3">
            <button 
                onClick={() => navigate('/admin/users')} 
                className="btn btn-light btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center"
                style={{width: 32, height: 32}}
                title="Back to list"
            >
                <i className="bi bi-arrow-left"></i>
            </button>
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 small">
                    <li className="breadcrumb-item text-muted">Administration</li>
                    <li className="breadcrumb-item"><Link to="/admin/users" className="text-decoration-none text-muted">Users</Link></li>
                    <li className="breadcrumb-item active fw-bold" style={{ color: '#008784' }}>Create New</li>
                </ol>
            </nav>
        </div>
      </div>

      {/* 2. MAIN CONTENT - Full Height & Scrollable */}
      <div className="flex-grow-1 overflow-y-auto">
         
         {/* Wrapper centered but full white background */}
         <div className="p-4 p-md-5 mx-auto" style={{maxWidth: '900px'}}>
            
            {/* Header Form */}
            <div className="mb-5 pb-4 border-bottom">
                <div className="d-flex flex-column flex-md-row align-items-center gap-3">
                    <div className="d-inline-flex align-items-center justify-content-center bg-light rounded-circle shadow-sm" 
                         style={{ width: '64px', height: '64px' }}>
                        <i className="bi bi-person-plus-fill fs-3" style={{ color: '#008784' }}></i>
                    </div>
                    <div className="text-center text-md-start">
                        <h3 className="fw-bold text-dark mb-1">Add New User</h3>
                        <p className="text-muted small mb-0">
                            Fill in information to create an account for the Internal Portal.
                        </p>
                    </div>
                </div>
            </div>

            {/* Notifications */}
            {msg && <div className="alert alert-success d-flex align-items-center shadow-sm mb-4"><i className="bi bi-check-circle-fill me-2"></i>{msg}</div>}
            {err && <div className="alert alert-danger d-flex align-items-center shadow-sm mb-4"><i className="bi bi-exclamation-triangle-fill me-2"></i>{err}</div>}

            <form onSubmit={onSubmit}>
                
                {/* SECTION 1: GENERAL INFORMATION */}
                <div className="row g-4 mb-5">
                    <div className="col-md-6">
                        <label className="form-label fw-bold text-secondary small text-uppercase">Full Name <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-person"></i></span>
                            <input 
                                className="form-control border-start-0" 
                                placeholder="Ex: John Doe" 
                                value={name}
                                onChange={(e) => setName(e.target.value)} 
                                required 
                                style={{height: '45px'}}
                            />
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold text-secondary small text-uppercase">Email <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-envelope"></i></span>
                            <input 
                                className="form-control border-start-0" 
                                type="email" 
                                placeholder="email@company.com" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)} 
                                required 
                                style={{height: '45px'}}
                            />
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold text-secondary small text-uppercase">Department <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-building"></i></span>
                            <select 
                                className="form-select border-start-0" 
                                value={department} 
                                onChange={(e) => setDepartment(e.target.value)}
                                style={{height: '45px'}}
                            >
                                <option value="IT">IT (Information Technology)</option>
                                <option value="HR">HR (Human Resources)</option>
                                <option value="SALES">Sales</option>
                                <option value="MARKETING">Marketing & Communications</option>
                                <option value="ACCOUNTING">Finance & Accounting</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <label className="form-label fw-bold text-secondary small text-uppercase">Phone Number</label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-telephone"></i></span>
                            <input 
                                className="form-control border-start-0" 
                                type="text" 
                                placeholder="0912..."
                                value={phoneNumber} 
                                onChange={(e) => setPhoneNumber(e.target.value)} 
                                style={{height: '45px'}}
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 2: SECURITY */}
                <h6 className="text-uppercase text-muted fw-bold small border-bottom pb-2 mb-4">
                    <i className="bi bi-shield-lock me-2"></i>Security Settings
                </h6>

                <div className="row g-4">
                    <div className="col-12">
                        <label className="form-label fw-bold text-secondary small text-uppercase">Initial Password <span className="text-danger">*</span></label>
                        <div className="input-group">
                            <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-key"></i></span>
                            <input 
                                className="form-control border-start-0 border-end-0" 
                                type={showPass ? "text" : "password"}
                                placeholder="Enter default password (min 6 chars)"
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                minLength={6} 
                                required 
                                style={{height: '45px'}}
                            />
                            <button 
                                type="button"
                                className="btn btn-outline-secondary border-start-0 border-light bg-white text-muted pe-3"
                                onClick={() => setShowPass(!showPass)}
                            >
                                <i className={`bi ${showPass ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                        <div className="form-text mt-2 text-muted">
                            <i className="bi bi-info-circle me-1"></i>
                            The user will be required to change this password upon first login.
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-5 pt-4 border-top d-flex justify-content-end gap-3">
                        <button 
                            type="button" 
                            className="btn btn-light px-4" 
                            onClick={() => navigate('/admin/users')}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="btn btn-primary px-5 fw-bold"
                            disabled={loading}
                            style={{ backgroundColor: '#008784', borderColor: '#008784' }}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check-lg me-2"></i> Complete
                                </>
                            )}
                        </button>
                </div>

            </form>
         </div>
      </div>
    </div>
  );
}