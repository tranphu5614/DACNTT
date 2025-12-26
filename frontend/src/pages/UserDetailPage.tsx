import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { request } from '../api/request'; 
import { apiUpdateUser, UserItem } from '../api/users';

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, hasRole } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      const res = await request<UserItem>(`/users/${id}`, { method: 'GET' }, token!);
      
      setName(res.name);
      setEmail(res.email);
      setPhoneNumber(res.phoneNumber || '');
      setDepartment(res.department || 'IT');
      setCurrentRoles(res.roles);

      const isMgr = res.roles.includes('MANAGER') || res.roles.some(r => r.endsWith('_MANAGER'));
      setIsManager(isMgr);

    } catch (err) {
      console.error(err);
      alert('Không tải được thông tin nhân viên');
      navigate('/admin/users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Lưu thay đổi thông tin nhân viên?')) return;

    setSaving(true);
    try {
      await apiUpdateUser(token!, id!, {
        name,
        phoneNumber,
        department,
        isManager 
      });
      
      alert('Cập nhật thành công!');
      await loadUser(); 
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
      <div className="d-flex align-items-center justify-content-center h-100 bg-white">
          <div className="spinner-border text-primary" role="status"></div>
      </div>
  );

  const isAdmin = hasRole('ADMIN');

  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* 1. HEADER (CONTROL PANEL) - Dính liền, không margin/padding thừa */}
      <div className="border-bottom px-4 py-3 d-flex justify-content-between align-items-center bg-white sticky-top" style={{zIndex: 100}}>
        
        {/* Breadcrumb + Title */}
        <div className="d-flex align-items-center gap-3">
            <button 
                onClick={() => navigate('/admin/users')} 
                className="btn btn-light btn-sm border-0 rounded-circle d-flex align-items-center justify-content-center" 
                style={{width: 32, height: 32}}
                title="Quay lại danh sách"
            >
                <i className="bi bi-arrow-left"></i>
            </button>
            <div>
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb mb-0 small" style={{fontSize: '0.75rem'}}>
                        <li className="breadcrumb-item"><Link to="/admin/users" className="text-decoration-none text-muted">NHÂN VIÊN</Link></li>
                        <li className="breadcrumb-item active fw-bold text-uppercase" style={{ color: '#008784' }}>CHI TIẾT</li>
                    </ol>
                </nav>
                <h5 className="mb-0 fw-bold text-dark">{name || 'Đang tải...'}</h5>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2">
            {isAdmin && (
                <button 
                    className="btn btn-primary fw-bold px-4 shadow-sm" 
                    onClick={handleSave} 
                    disabled={saving}
                    style={{ backgroundColor: '#008784', borderColor: '#008784' }}
                >
                    {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-cloud-arrow-up-fill me-2"></i>}
                    Lưu Thay Đổi
                </button>
            )}
        </div>
      </div>

      {/* 2. BODY CONTENT - Full Width & Height, Split View */}
      <div className="flex-grow-1 overflow-hidden">
         <div className="row g-0 h-100">
            
            {/* Cột Trái: FORM NHẬP LIỆU (Chiếm 8/12) - Scrollable */}
            <div className="col-lg-8 h-100 overflow-y-auto">
                <div className="p-5" style={{maxWidth: '900px'}}>
                    <h6 className="text-uppercase text-muted fw-bold small border-bottom pb-2 mb-4">
                        <i className="bi bi-person-lines-fill me-2"></i>Thông tin chung
                    </h6>
                    
                    <form id="userForm">
                        <div className="row g-4 mb-5">
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary small text-uppercase">Họ và tên</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={name} 
                                    onChange={e => setName(e.target.value)} 
                                    required 
                                    disabled={!isAdmin}
                                    style={{height: '45px'}}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary small text-uppercase">Email <span className="text-muted fw-normal fst-italic ms-1">(Read-only)</span></label>
                                <input 
                                    type="text" 
                                    className="form-control bg-light text-muted" 
                                    value={email} 
                                    disabled 
                                    style={{height: '45px'}}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary small text-uppercase">Số điện thoại</label>
                                <input 
                                    type="text" 
                                    className="form-control" 
                                    value={phoneNumber} 
                                    onChange={e => setPhoneNumber(e.target.value)}
                                    disabled={!isAdmin}
                                    style={{height: '45px'}}
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label fw-bold text-secondary small text-uppercase">Phòng ban</label>
                                <select 
                                    className="form-select" 
                                    value={department} 
                                    onChange={e => setDepartment(e.target.value)}
                                    disabled={!isAdmin}
                                    style={{height: '45px'}}
                                >
                                    <option value="IT">IT (Công nghệ thông tin)</option>
                                    <option value="HR">HR (Nhân sự)</option>
                                    <option value="SALES">Sales (Kinh doanh)</option>
                                    <option value="ACCOUNTING">Kế toán</option>
                                </select>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Cột Phải: SIDEBAR CẤU HÌNH (Chiếm 4/12) - Background xám nhạt */}
            <div className="col-lg-4 border-start bg-light h-100 overflow-y-auto">
                <div className="p-4">
                    <h6 className="text-uppercase text-muted fw-bold small border-bottom pb-2 mb-4">
                        <i className="bi bi-gear-fill me-2"></i>Cấu hình & Phân quyền
                    </h6>

                    {/* Switch Manager */}
                    {isAdmin && (
                        <div className="bg-white p-4 rounded border shadow-sm mb-4">
                            <div className="form-check form-switch">
                                <input 
                                    className="form-check-input" 
                                    type="checkbox" 
                                    id="managerCheck"
                                    checked={isManager}
                                    onChange={e => setIsManager(e.target.checked)}
                                    style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
                                />
                                <label className="form-check-label ms-3 pt-1 fw-bold text-dark" htmlFor="managerCheck" style={{cursor: 'pointer'}}>
                                    Chỉ định Quản lý (Manager)
                                </label>
                            </div>
                            <div className="mt-3 text-muted small lh-sm">
                                Khi kích hoạt, nhân viên này sẽ có quyền duyệt các yêu cầu thuộc phòng ban <strong>{department || '...'}</strong>.
                            </div>
                        </div>
                    )}

                    {/* Current Roles */}
                    <div className="mb-4">
                        <label className="form-label fw-bold text-secondary small text-uppercase mb-3">Vai trò hiện tại trong hệ thống</label>
                        <div className="d-flex flex-wrap gap-2">
                            {currentRoles.map(r => (
                                <span key={r} className={`badge px-3 py-2 border rounded-pill fw-normal ${
                                    r === 'ADMIN' ? 'bg-danger-subtle text-danger border-danger-subtle' : 
                                    r.includes('MANAGER') ? 'bg-success-subtle text-success border-success-subtle' : 
                                    'bg-white text-dark border-secondary-subtle'
                                }`}>
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="border-top pt-4">
                        <table className="table table-borderless table-sm text-muted small m-0">
                            <tbody>
                                <tr>
                                    <td style={{width: 100}}>ID Hệ thống:</td>
                                    <td className="font-monospace text-dark">{id}</td>
                                </tr>
                                
                                <tr>
                                    <td>Ngày tạo:</td>
                                    <td>---</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>

         </div>
      </div>
    </div>
  );
}