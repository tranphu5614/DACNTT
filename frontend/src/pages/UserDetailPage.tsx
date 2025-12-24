import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [email, setEmail] = useState(''); // Email thường không cho sửa, chỉ view
  const [phoneNumber, setPhoneNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [isManager, setIsManager] = useState(false);
  const [currentRoles, setCurrentRoles] = useState<string[]>([]);

  useEffect(() => {
    loadUser();
  }, [id]);

  const loadUser = async () => {
    try {
      // Gọi API Get Detail (dùng hàm request hoặc apiGetProfileByAdmin nếu có)
      const res = await request<UserItem>(`/users/${id}`, { method: 'GET' }, token!);
      
      setName(res.name);
      setEmail(res.email);
      setPhoneNumber(res.phoneNumber || '');
      setDepartment(res.department || 'IT');
      setCurrentRoles(res.roles);

      // Check xem hiện tại có phải manager không
      const isMgr = res.roles.includes('MANAGER') || 
                    res.roles.some(r => r.endsWith('_MANAGER'));
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
        isManager // Gửi trạng thái checkbox xuống backend xử lý role
      });
      
      alert('Cập nhật thành công!');
      await loadUser(); // Load lại để thấy role mới
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-5 text-center">Đang tải...</div>;

  const isAdmin = hasRole('ADMIN');

  return (
    <div className="container py-4" style={{ maxWidth: 800 }}>
      <div className="d-flex justify-content-between align-items-center mb-4 border-bottom pb-3">
        <h3>Chi tiết nhân viên</h3>
        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          <i className="bi bi-arrow-left me-2"></i>Quay lại
        </button>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header bg-light fw-bold">Thông tin cá nhân</div>
            <div className="card-body">
              <form onSubmit={handleSave}>
                <div className="mb-3">
                  <label className="form-label text-muted small">Email (Không thể sửa)</label>
                  <input type="text" className="form-control bg-light" value={email} disabled />
                </div>

                <div className="mb-3">
                  <label className="form-label">Họ tên</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    required 
                    disabled={!isAdmin}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Số điện thoại</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={phoneNumber} 
                    onChange={e => setPhoneNumber(e.target.value)}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Phòng ban</label>
                  <select 
                    className="form-select" 
                    value={department} 
                    onChange={e => setDepartment(e.target.value)}
                    disabled={!isAdmin}
                  >
                    <option value="IT">IT (Công nghệ thông tin)</option>
                    <option value="HR">HR (Nhân sự)</option>
                    <option value="SALES">Sales</option>
                    <option value="ACCOUNTING">Kế toán</option>
                  </select>
                </div>

                {/* KHU VỰC PHÂN QUYỀN */}
                {isAdmin && (
                  <div className="mb-4 p-3 bg-light rounded border border-warning">
                    <label className="form-label fw-bold text-dark mb-2">Phân quyền</label>
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="managerCheck"
                        checked={isManager}
                        onChange={e => setIsManager(e.target.checked)}
                        style={{ width: '3em', height: '1.5em', cursor: 'pointer' }}
                      />
                      <label className="form-check-label ms-2 mt-1 fw-bold" htmlFor="managerCheck">
                        Là Quản lý (Manager)
                      </label>
                    </div>
                    <div className="form-text mt-2">
                      <i className="bi bi-info-circle-fill me-1"></i>
                      Nếu được tick: Hệ thống sẽ tự động cấp quyền <strong>{department}_MANAGER</strong> dựa trên phòng ban đang chọn.
                    </div>
                  </div>
                )}

                {isAdmin && (
                  <div className="d-grid">
                    <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
                      {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* CỘT BÊN PHẢI: HIỂN THỊ ROLES HIỆN TẠI */}
        <div className="col-md-4">
          <div className="card shadow-sm mb-3">
            <div className="card-header bg-light fw-bold">Vai trò hiện tại</div>
            <div className="card-body">
              <div className="d-flex flex-wrap gap-2">
                {currentRoles.map(r => (
                  <span key={r} className={`badge ${r === 'ADMIN' ? 'bg-danger' : r.includes('MANAGER') ? 'bg-success' : 'bg-secondary'}`}>
                    {r}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="alert alert-info small">
            <strong>Ghi chú:</strong>
            <ul className="ps-3 mb-0 mt-1">
              <li>Role <strong>USER</strong> là mặc định.</li>
              <li>Thay đổi phòng ban sẽ ảnh hưởng đến role quản lý nếu ô checkbox đang được bật.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}