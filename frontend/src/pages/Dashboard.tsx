import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, hasRole } = useAuth();
  return (
    <div className="page">
      <h1>Dashboard</h1>
      <p>Chào <b>{user?.name}</b> 👋</p>
      <p>Email: {user?.email}</p>
      <p>Roles: <code>{user?.roles?.join(', ') || '(none)'}</code></p>

      {hasRole('ADMIN') ? (
        <div className="callout success">Bạn có quyền admin.</div>
      ) : hasRole('IT_MANAGER') ? (
        <div className="callout">Bạn là IT manager.</div>
      ) : hasRole('HR_MANAGER') ? (
        <div className="callout">Bạn là HR manager.</div>
      ) : (
        <div className="callout">Bạn là user thường.</div>
      )}
    </div>
  );
}
