import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { token, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="card-title mb-1">Tạo tài khoản</h4>
        <p className="text-secondary">Self-registration hiện bị vô hiệu hoá</p>
        <p>Vui lòng liên hệ quản trị viên để được tạo tài khoản.</p>
        {token && isAdmin && (
          <p className="mb-0">
            Bạn là admin? <Link to="/admin/users/create">Tạo user tại đây</Link>.
          </p>
        )}
      </div>
    </div>
  );
}
