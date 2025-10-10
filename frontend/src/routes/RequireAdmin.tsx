import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireAdmin({ children }: { children: JSX.Element }) {
  const { hasRole } = useAuth();
  return hasRole('admin') ? children : <Navigate to="/" replace />;
}
