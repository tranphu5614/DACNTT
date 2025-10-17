import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RequireRoles({
  anyOf,
  children,
}: {
  anyOf: string[];
  children: JSX.Element;
}) {
  const { hasRole } = useAuth();
  const ok = (anyOf || []).some((r) => hasRole(r));
  return ok ? children : <Navigate to="/profile" replace />;
}
