import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, hasRole } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="brand">Internal Request</Link>
        {user && <Link to="/profile">Profile</Link>}
        {user && hasRole && hasRole('ADMIN') && (
          <>
            <Link to="/admin/users">Users</Link>
            <Link to="/admin/users/create">Create User</Link>
          </>
        )}
      </div>
      <div className="nav-right">
        {user ? (
          <>
            <span className="muted">Hi, {user.name}</span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register" className="primary">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
