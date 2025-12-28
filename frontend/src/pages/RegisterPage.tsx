import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { token, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="card-title mb-1">Create Account</h4>
        <p className="text-secondary">Self-registration is currently disabled</p>
        <p>Please contact an administrator to request an account.</p>
        {token && isAdmin && (
          <p className="mb-0">
            Are you an admin? <Link to="/admin/users/create">Create user here</Link>.
          </p>
        )}
      </div>
    </div>
  );
}