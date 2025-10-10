import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Header() {
  const { user, hasRole, logout } = useAuth();

  return (
    <header className="app-header">
      <nav className="nav">
        <NavLink to="/">Internal Request</NavLink>
        <NavLink to="/profile">Profile</NavLink>
        {hasRole('admin') && <NavLink to="/admin/users">Users</NavLink>}
      </nav>

      <div className="auth">
        {user ? (
          <>
            <span>{user.name}</span>
            <button onClick={logout}>Đăng xuất</button>
          </>
        ) : (
          <NavLink to="/login">Đăng nhập</NavLink>
        )}
      </div>
    </header>
  );
}
