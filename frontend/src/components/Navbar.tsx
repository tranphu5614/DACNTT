import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  return (
    <nav className="nav">
      <div className="nav-left">
        <Link to="/" className="brand">Internal Request</Link>
        <Link to="/profile">Profile</Link>
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
