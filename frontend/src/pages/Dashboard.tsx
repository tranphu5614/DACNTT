import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, hasRole } = useAuth();

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      
      {/* Header */}
      <h2 className="fw-bold mb-1">Dashboard</h2>
      <p className="text-muted">Tổng quan thông tin tài khoản của bạn</p>

      {/* User Card */}
      <div className="card mb-4 p-4" style={{ borderRadius: 16 }}>
        <h4 className="fw-semibold">Xin chào 👋</h4>
        <p className="mb-1">
          <b>{user?.name}</b>
        </p>
        <p className="text-muted mb-2">{user?.email}</p>

        {/* Roles */}
        <div className="d-flex flex-wrap gap-2 mb-3">
          {(user?.roles || []).map((r) => (
            <span key={r} className="badge text-bg-primary px-3 py-2" style={{ borderRadius: 12 }}>
              {r}
            </span>
          ))}
        </div>

        {/* Role Message */}
        {hasRole('ADMIN') ? (
          <div className="callout success">
            <b>Quyền hiện tại:</b> Admin – bạn có toàn quyền truy cập hệ thống.
          </div>
        ) : hasRole('IT_MANAGER') ? (
          <div className="callout">
            <b>Quyền hiện tại:</b> IT Manager – bạn có thể xử lý yêu cầu liên quan đến IT.
          </div>
        ) : hasRole('HR_MANAGER') ? (
          <div className="callout">
            <b>Quyền hiện tại:</b> HR Manager – bạn có thể xử lý yêu cầu nhân sự.
          </div>
        ) : (
          <div className="callout">
            <b>Quyền hiện tại:</b> User thường – bạn chỉ có thể tạo yêu cầu.
          </div>
        )}
      </div>
    </div>
  );
}
