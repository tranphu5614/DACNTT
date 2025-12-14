import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="page" style={{ maxWidth: 720, margin: '0 auto' }}>
      {/* Header */}
      <h2 className="fw-bold mb-3">Thông tin tài khoản</h2>

      {/* Card */}
      <div className="card shadow-sm p-4" style={{ borderRadius: 16 }}>
        <div className="d-flex align-items-center gap-4">

          {/* Avatar */}
          <div
            className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center shadow-sm"
            style={{
              width: 72,
              height: 72,
              fontSize: 26,
              fontWeight: 600,
            }}
          >
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>

          {/* Info */}
          <div>
            <div className="fw-semibold fs-5">{user.name}</div>
            <div className="text-muted">{user.email}</div>

            {/* Roles */}
            <div className="mt-3 d-flex gap-2 flex-wrap">
              {(user.roles || []).map((r) => (
                <span
                  key={r}
                  className="badge px-3 py-2"
                  style={{
                    background: "var(--blue-100, #e0f2fe)",
                    color: "#0369a1",
                    borderRadius: 12,
                    fontSize: "0.85rem",
                  }}
                >
                  {r}
                </span>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
