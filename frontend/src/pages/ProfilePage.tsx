import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h4 className="card-title mb-3">Profile</h4>

        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded bg-primary text-white d-flex align-items-center justify-content-center"
            style={{ width: 56, height: 56, fontSize: 22 }}
          >
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <div className="fw-semibold">{user.name}</div>
            <div className="text-secondary">{user.email}</div>
            <div className="mt-2 d-flex gap-2 flex-wrap">
              {(user.roles || []).map((r) => (
                <span key={r} className="badge text-bg-info">{r}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
