import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { token, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="page" style={{ maxWidth: 480, margin: '0 auto' }}>
      <div className="card shadow-sm p-4" style={{ borderRadius: 16 }}>
        
        <h3 className="fw-bold mb-2">Tạo tài khoản</h3>
        <p className="text-muted mb-3">Tính năng đăng ký hiện đã bị tắt</p>

        {/* Icon + message */}
        <div
          className="d-flex align-items-start gap-3 p-3 rounded"
          style={{
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            borderRadius: 12,
          }}
        >
          <div
            className="d-flex align-items-center justify-content-center rounded-circle"
            style={{
              width: 40,
              height: 40,
              background: "#fdba74",
              color: "#7c2d12",
              fontWeight: 700,
              fontSize: 20,
            }}
          >
            !
          </div>

          <div>
            <div className="fw-semibold" style={{ color: "#7c2d12" }}>
              Self-registration bị vô hiệu hoá
            </div>
            <div className="text-muted small">
              Vui lòng liên hệ quản trị viên để được cấp tài khoản truy cập hệ thống.
            </div>
          </div>
        </div>

        {/* Admin shortcut */}
        {token && isAdmin && (
          <div className="mt-4 text-center">
            <p className="text-muted mb-1">Bạn là admin?</p>
            <Link to="/admin/users/create" className="btn btn-primary btn-sm px-3">
              Tạo user mới
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}
