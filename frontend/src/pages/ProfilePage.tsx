import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiUploadAvatar } from '../api/users'; // Đảm bảo đã import hàm này

// Lấy URL Backend để hiển thị ảnh
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProfilePage() {
  const { user, refreshMe, token } = useAuth(); // Lấy thêm refreshMe và token
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  // Helper: Lấy chữ cái đầu (dùng khi chưa có ảnh)
  const getInitials = (name: string) => name ? name.charAt(0).toUpperCase() : 'U';

  // Helper: Xử lý đường dẫn ảnh (nếu là đường dẫn tương đối thì thêm domain backend)
  const getAvatarUrl = (path?: string) => {
      if (!path) return null;
      return path.startsWith('http') ? path : `${API_BASE_URL}/uploads/${path}`;
  };

  const avatarSrc = getAvatarUrl(user.avatar);

  // Xử lý upload ảnh
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    // Validate đơn giản
    if (!file.type.startsWith('image/')) {
        alert('Vui lòng chọn file hình ảnh (JPG, PNG...)');
        return;
    }

    setUploading(true);
    try {
      await apiUploadAvatar(token, file);
      await refreshMe(); // Gọi hàm này để reload thông tin user (hiển thị ảnh mới ngay lập tức)
      alert('Đã cập nhật ảnh đại diện!');
    } catch (err: any) {
      alert(err.message || 'Lỗi khi upload ảnh');
    } finally {
      setUploading(false);
      // Reset input để cho phép chọn lại cùng 1 file nếu muốn
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleLogout = () => {
    if (confirm('Bạn muốn đăng xuất?')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
    }
  };

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* 1. CONTROL PANEL */}
      <div className="o_control_panel bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 99, height: 60}}>
        <div>
           <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item text-muted">Hệ thống</li>
              <li className="breadcrumb-item active fw-bold text-primary">Hồ sơ cá nhân</li>
            </ol>
          </nav>
        </div>
        <div>
            <button className="btn btn-sm btn-outline-danger" onClick={handleLogout}>
                <i className="bi bi-box-arrow-right me-1"></i> Đăng xuất
            </button>
        </div>
      </div>

      {/* 2. MAIN SHEET */}
      <div className="flex-grow-1 overflow-y-auto p-4 d-flex justify-content-center">
         <div className="bg-white border shadow-sm rounded w-100" style={{maxWidth: 960, minHeight: 'fit-content'}}>
            
            {/* Sheet Header */}
            <div className="p-4 p-md-5">
                <div className="d-flex flex-column flex-md-row align-items-center align-items-md-start gap-4 mb-5 border-bottom pb-4">
                    
                    {/* --- AVATAR AREA (CÓ CHỨC NĂNG CHỈNH SỬA) --- */}
                    <div className="position-relative">
                        <div 
                            className="rounded bg-primary-subtle text-primary d-flex align-items-center justify-content-center border border-primary-subtle shadow-sm overflow-hidden"
                            style={{width: 100, height: 100, fontSize: '2.5rem', fontWeight: 'bold'}}
                        >
                            {avatarSrc ? (
                                <img src={avatarSrc} alt="Avatar" className="w-100 h-100 object-fit-cover" />
                            ) : (
                                getInitials(user.name)
                            )}
                        </div>

                        {/* Nút Camera (Nằm đè lên góc phải dưới avatar) */}
                        <button 
                            className="btn btn-sm btn-light border position-absolute rounded-circle shadow-sm d-flex align-items-center justify-content-center"
                            style={{width: 32, height: 32, bottom: -5, right: -5, padding: 0}}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            title="Đổi ảnh đại diện"
                        >
                            {uploading ? (
                                <span className="spinner-border spinner-border-sm text-primary" style={{width: '0.8rem', height: '0.8rem'}}></span>
                            ) : (
                                <i className="bi bi-camera-fill text-dark small"></i>
                            )}
                        </button>

                        {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="d-none" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                        />
                    </div>

                    {/* Tên & Role */}
                    <div className="text-center text-md-start flex-grow-1">
                        <h1 className="h2 fw-bold text-dark mb-2">{user.name}</h1>
                        <div className="d-flex flex-wrap justify-content-center justify-content-md-start gap-2">
                            {user.roles?.map((r) => (
                                <span key={r} className={`badge border px-3 py-2 rounded-pill ${
                                    r === 'ADMIN' ? 'bg-danger-subtle text-danger border-danger-subtle' :
                                    r.includes('MANAGER') ? 'bg-warning-subtle text-dark border-warning-subtle' :
                                    'bg-info-subtle text-info-emphasis border-info-subtle'
                                }`}>
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* ID Badge (Góc phải) */}
                    <div className="d-none d-md-block text-end">
                        <div className="border rounded px-3 py-2 bg-light">
                            <small className="text-muted d-block text-uppercase" style={{fontSize: '0.65rem'}}>System ID</small>
                            <span className="font-monospace fw-bold text-secondary">{user._id.slice(-6).toUpperCase()}</span>
                        </div>
                    </div>
                </div>

                {/* Thông tin chi tiết */}
                <div className="row g-5">
                    <div className="col-md-6">
                        <h6 className="text-primary text-uppercase border-bottom pb-2 mb-3 fw-bold small">
                            <i className="bi bi-person-vcard me-2"></i>Thông tin liên hệ
                        </h6>
                        <table className="table table-borderless">
                            <tbody>
                                <tr>
                                    <td className="text-muted w-25 align-middle">Email:</td>
                                    <td className="fw-500">{user.email}</td>
                                </tr>
                                <tr>
                                    <td className="text-muted align-middle">Điện thoại:</td>
                                    <td className="fw-500">{user.phoneNumber || <span className="text-muted fst-italic">-- Chưa cập nhật --</span>}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="col-md-6">
                        <h6 className="text-primary text-uppercase border-bottom pb-2 mb-3 fw-bold small">
                            <i className="bi bi-building me-2"></i>Công việc
                        </h6>
                        <table className="table table-borderless">
                            <tbody>
                                <tr>
                                    <td className="text-muted w-25 align-middle">Phòng ban:</td>
                                    <td>
                                        {user.department ? (
                                            <span className="badge bg-light text-dark border px-2">
                                                {user.department}
                                            </span>
                                        ) : <span className="text-muted fst-italic">--</span>}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="text-muted align-middle">Trạng thái:</td>
                                    <td><span className="text-success fw-bold"><i className="bi bi-dot"></i> Đang hoạt động</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer Quote or Extra Info */}
                <div className="mt-5 pt-4 text-center text-muted border-top small">
                    <p className="mb-0">Tài khoản được quản lý bởi hệ thống Helpdesk.</p>
                </div>
            </div>
         </div>
      </div>
    </div>
  );
}