import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ roles }: { roles?: string[] }) {
  const { token, user } = useAuth();
  const loc = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (roles && roles.length > 0) {
    const ok = roles.some(r => user?.roles?.includes(r));
    if (!ok) return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
