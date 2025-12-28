import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUploadAvatar, apiChangePassword } from '../api/users'; 

// Backend URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProfilePage() {
  const { user, refreshMe, token } = useAuth();
  const [uploading, setUploading] = useState(false);
  
  // Change Password State
  const [showChangePass, setShowChangePass] = useState(false);
  const [passData, setPassData] = useState({ current: '', new: '', confirm: '' });
  const [passStatus, setPassStatus] = useState<'idle' | 'loading'>('idle');

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : 'U';
  
  const getAvatarUrl = (path?: string) => {
      if (!path) return null;
      return path.startsWith('http') ? path : `${API_BASE_URL}/uploads/${path}`;
  };

  const avatarSrc = getAvatarUrl(user.avatar);

  // --- UPLOAD LOGIC ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (!file.type.startsWith('image/')) {
        alert('Please select an image file (JPG, PNG...)');
        return;
    }

    setUploading(true);
    try {
      await apiUploadAvatar(token, file);
      await refreshMe();
    } catch (err: any) {
      alert(err.message || 'Error uploading image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --- CHANGE PASSWORD LOGIC ---
  const handleChangePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (passData.new !== passData.confirm) {
        alert('Password confirmation does not match!');
        return;
    }
    if (passData.new.length < 6) {
        alert('New password must be at least 6 characters long.');
        return;
    }

    setPassStatus('loading');
    try {
        await apiChangePassword(token, {
            currentPassword: passData.current,
            newPassword: passData.new
        });
        alert('Password changed successfully!');
        setShowChangePass(false);
        setPassData({ current: '', new: '', confirm: '' });
    } catch (err: any) {
        alert(err.response?.data?.message || 'Error changing password. Check your old password.');
    } finally {
        setPassStatus('idle');
    }
  };

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f9f9f9' }}>
      
      {/* SCROLLABLE CONTENT - Full Width Container */}
      <div className="flex-grow-1 overflow-y-auto p-3">
         
         {/* MAIN CARD - Removed maxWidth to fill width */}
         <div className="bg-white border shadow-sm rounded w-100 position-relative h-100 d-flex flex-column">
            
            {/* 1. INTERNAL HEADER (Breadcrumb & Logout) */}
            <div className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom bg-light rounded-top">
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb mb-0 small">
                        <li className="breadcrumb-item text-muted">System</li>
                        <li className="breadcrumb-item active fw-bold" style={{ color: '#008784' }}>Employee Profile</li>
                    </ol>
                </nav>
            </div>

            <div className="p-4 flex-grow-1 overflow-y-auto">
                
                {/* --- HEADER PROFILE (Avatar + Info) --- */}
                <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4 mb-5 border-bottom pb-4">
                    
                    {/* Avatar Wrapper */}
                    <div className="position-relative">
                        <div 
                            className="rounded-circle d-flex align-items-center justify-content-center shadow-sm overflow-hidden"
                            style={{
                                width: '120px', 
                                height: '120px', 
                                backgroundColor: '#e0f2f1',
                                color: '#008784',
                                fontSize: '3rem', 
                                fontWeight: 'bold',
                                border: '4px solid white',
                                boxShadow: '0 0 0 1px #dee2e6'
                            }}
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Avatar" className="w-100 h-100 object-fit-cover" />
                            ) : (
                                getInitials(user.name)
                            )}
                        </div>
                        {/* Upload Button */}
                        <button 
                            className="btn btn-light border position-absolute rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                            style={{width: '36px', height: '36px', bottom: '5px', right: '5px'}}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            title="Upload Image"
                        >
                            {uploading ? (
                                <span className="spinner-border spinner-border-sm text-secondary"></span>
                            ) : (
                                <i className="bi bi-camera-fill text-dark"></i>
                            )}
                        </button>
                        <input type="file" ref={fileInputRef} className="d-none" accept="image/*" onChange={handleFileChange} />
                    </div>

                    {/* Name & Roles */}
                    <div className="text-center text-md-start flex-grow-1 pt-2">
                        <h2 className="fw-bold text-dark mb-2">{user.name}</h2>
                        <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-2 mb-3">
                            {user.roles?.map((r) => (
                                <span key={r} className="badge bg-light text-dark border px-3 py-2 fw-normal">
                                    {r}
                                </span>
                            ))}
                        </div>
                        <div className="text-muted small">
                            <i className="bi bi-envelope me-2"></i>{user.email}
                        </div>
                    </div>

                    {/* ID Card */}
                    <div className="d-none d-md-block">
                        <div className="bg-light border rounded p-3 text-center" style={{ minWidth: '120px' }}>
                            <small className="text-muted d-block text-uppercase mb-1" style={{ fontSize: '0.7rem' }}>Employee ID</small>
                            <span className="fs-5 fw-bold font-monospace" style={{ color: '#008784' }}>
                                #{user._id.slice(-6).toUpperCase()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* --- DETAILED CONTENT (Split Columns) --- */}
                <div className="row g-5">
                    
                    {/* Left Column: Job Info */}
                    <div className="col-lg-6">
                        <h6 className="text-uppercase border-bottom pb-2 mb-3 fw-bold small text-muted">
                            <i className="bi bi-briefcase me-2"></i>Job Information
                        </h6>
                        <div className="table-responsive">
                            <table className="table table-borderless table-sm">
                                <tbody>
                                    <tr>
                                        <td className="text-muted w-50">Department:</td>
                                        <td className="fw-bold">{user.department || '---'}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">Job Title:</td>
                                        <td>{user.jobTitle || 'Employee'}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">Join Date:</td>
                                        <td>{new Date(user.createdAt || Date.now()).toLocaleDateString('en-US')}</td>
                                    </tr>
                                    <tr>
                                        <td className="text-muted">Phone Number:</td>
                                        <td>{user.phoneNumber || '---'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Column: Security */}
                    <div className="col-lg-6">
                        <h6 className="text-uppercase border-bottom pb-2 mb-3 fw-bold small text-muted">
                            <i className="bi bi-shield-check me-2"></i>Account Security
                        </h6>

                        {!showChangePass ? (
                            <div className="bg-light rounded p-3 d-flex align-items-center justify-content-between">
                                <div>
                                    <div className="fw-bold text-dark">Login Password</div>
                                </div>
                                <button 
                                    className="btn btn-outline-secondary btn-sm bg-white" 
                                    onClick={() => setShowChangePass(true)}
                                >
                                    Change Password
                                </button>
                            </div>
                        ) : (
                            <div className="card shadow-sm border-0 bg-light">
                                <div className="card-body">
                                    <h6 className="card-title fw-bold mb-3" style={{ color: '#008784' }}>Set New Password</h6>
                                    <form onSubmit={handleChangePass}>
                                        
                                        <div className="mb-2">
                                            <div className="input-group">
                                                <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-key"></i></span>
                                                <input 
                                                    type="password" 
                                                    className="form-control border-start-0" 
                                                    placeholder="Current Password"
                                                    required
                                                    value={passData.current}
                                                    onChange={e => setPassData({...passData, current: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-2">
                                            <div className="input-group">
                                                <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-lock"></i></span>
                                                <input 
                                                    type="password" 
                                                    className="form-control border-start-0" 
                                                    placeholder="New Password (min 6)"
                                                    required
                                                    minLength={6}
                                                    value={passData.new}
                                                    onChange={e => setPassData({...passData, new: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="mb-3">
                                            <div className="input-group">
                                                <span className="input-group-text bg-white border-end-0 text-muted"><i className="bi bi-shield-lock"></i></span>
                                                <input 
                                                    type="password" 
                                                    className="form-control border-start-0" 
                                                    placeholder="Confirm New Password"
                                                    required
                                                    value={passData.confirm}
                                                    onChange={e => setPassData({...passData, confirm: e.target.value})}
                                                />
                                            </div>
                                        </div>

                                        <div className="d-flex gap-2 justify-content-end">
                                            <button 
                                                type="button" 
                                                className="btn btn-link text-decoration-none text-muted btn-sm"
                                                onClick={() => {
                                                    setShowChangePass(false);
                                                    setPassData({current: '', new: '', confirm: ''});
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary btn-sm px-3 fw-bold"
                                                disabled={passStatus === 'loading'}
                                                style={{ backgroundColor: '#008784', borderColor: '#008784' }}
                                            >
                                                {passStatus === 'loading' ? 'Saving...' : 'Save Changes'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Quote */}
                <div className="mt-5 pt-4 text-center text-muted border-top small opacity-75">
                    "System security begins with individual awareness."
                </div>

            </div>
         </div>
      </div>
    </div>
  );
}