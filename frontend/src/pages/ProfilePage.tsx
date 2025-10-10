import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function roleLabel(r: string) {
  switch (r) {
    case 'admin':
      return 'Admin';
    case 'it_manager':
      return 'IT Manager';
    case 'hr_manager':
      return 'HR Manager';
    default:
      return 'User';
  }
}

export default function ProfilePage() {
  const { token, user, refreshMe } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  // Đồng bộ /users/me khi có token (và chưa có user)
  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr('');
      try {
        await refreshMe();
      } catch (e: any) {
        setErr(e?.message || 'Load profile failed');
      } finally {
        setLoading(false);
      }
    };
    if (token && !user) run();
  }, [token, user, refreshMe]);

  const badges = useMemo(
    () => (user?.roles ?? []).map((r) => (
      <span key={r} className="badge" style={{ marginRight: 6 }}>
        {roleLabel(r)}
      </span>
    )),
    [user]
  );

  if (!token) {
    return (
      <div className="page">
        <h1>Profile</h1>
        <div className="callout">
          Bạn chưa đăng nhập. <Link to="/login">Đăng nhập</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Profile</h1>

      {loading && <p>Đang tải...</p>}
      {err && <div className="error">{err}</div>}

      {!loading && !err && user && (
        <>
          {/* Callout theo vai trò */}
          {user.roles?.includes('admin') && (
            <div className="callout success" style={{ marginBottom: 12 }}>
              Bạn có quyền Admin.
            </div>
          )}
          {user.roles?.includes('it_manager') && (
            <div className="callout" style={{ marginBottom: 12 }}>
              Bạn là <b>IT Manager</b>.
            </div>
          )}
          {user.roles?.includes('hr_manager') && (
            <div className="callout" style={{ marginBottom: 12 }}>
              Bạn là <b>HR Manager</b>.
            </div>
          )}

          {/* Thông tin cơ bản */}
          <div className="card">
            <div className="card-body">
              <div style={{ marginBottom: 8 }}>
                <strong>Họ tên:</strong> {user.name}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>Email:</strong> {user.email}
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>User ID:</strong> <code>{user._id}</code>
              </div>
              <div>
                <strong>Roles:</strong> {badges.length ? badges : '—'}
              </div>
            </div>
          </div>

          <p style={{ marginTop: 16 }}>
            Dữ liệu được đồng bộ từ <code>/users/me</code>.
          </p>
        </>
      )}
    </div>
  );
}
