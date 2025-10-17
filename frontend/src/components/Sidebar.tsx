import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Variant = 'static' | 'offcanvas';

export default function Sidebar({ variant = 'static' }: { variant?: Variant }) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const NavItems = () => (
    <>
      <div className="mb-2 small text-uppercase text-secondary">General</div>
    {(hasRole('ADMIN') || hasRole('HR_MANAGER') || hasRole('IT_MANAGER')) && (
    <>
        <div className="mb-2 small text-uppercase text-secondary">Queues</div>
        <ul className="list-group mb-3">
            {(hasRole('ADMIN') || hasRole('HR_MANAGER')) && (
                <li className="list-group-item p-0 border-0 bg-transparent">
                <NavLink
                    to="/queue/hr"
                    className={({ isActive }) =>
                    'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
                    }
                >
                    Hàng chờ HR
                </NavLink>
                </li>
            )}
            {(hasRole('ADMIN') || hasRole('IT_MANAGER')) && (
                <li className="list-group-item p-0 border-0 bg-transparent">
                <NavLink
                    to="/queue/it"
                    className={({ isActive }) =>
                    'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
                    }
                >
                    Hàng chờ IT
                </NavLink>
                </li>
            )}
            </ul>
        </>
    )}

      <ul className="list-group mb-3">
        <li className="list-group-item p-0 border-0 bg-transparent">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
            }
          >
            Profile
          </NavLink>
        </li>
        <li className="list-group-item p-0 border-0 bg-transparent">
          <NavLink
            to="/requests/new"
            className={({ isActive }) =>
              'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
            }
          >
            Gửi yêu cầu
          </NavLink>
        </li>
        <li className="list-group-item p-0 border-0 bg-transparent">
          <NavLink
            to="/requests/mine"
            className={({ isActive }) =>
              'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
            }
          >
            Yêu cầu của tôi
          </NavLink>
        </li>
      </ul>

      {isAdmin && (
        <>
          <div className="mb-2 small text-uppercase text-secondary">Admin</div>
          <ul className="list-group">
            <li className="list-group-item p-0 border-0 bg-transparent">
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
                }
              >
                Users
              </NavLink>
            </li>
            <li className="list-group-item p-0 border-0 bg-transparent">
              <NavLink
                to="/admin/users/create"
                className={({ isActive }) =>
                  'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
                }
              >
                Create user
              </NavLink>
            </li>
          </ul>
        </>
      )}
    </>
  );

  const UserCard = () =>
    user ? (
      <div className="d-flex align-items-center gap-2 mt-3 p-2 rounded border">
        <div
          className="rounded bg-primary text-white d-flex align-items-center justify-content-center"
          style={{ width: 36, height: 36 }}
        >
          {user.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div className="small">
          <div className="fw-semibold">{user.name}</div>
          <div className="text-secondary">{user.email}</div>
        </div>
      </div>
    ) : null;

  if (variant === 'offcanvas') {
    // Mobile offcanvas
    return (
      <div className="offcanvas offcanvas-start" tabIndex={-1} id="appSidebar" aria-labelledby="appSidebarLabel">
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="appSidebarLabel">Internal Request</h5>
          <button type="button" className="btn-close" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body">
          <NavItems />
          <UserCard />
        </div>
      </div>
    );
  }

  // Desktop static sidebar
  return (
    <aside className="p-3 sticky-top" style={{ top: 0 }}>
      <div className="h5 mb-3">Internal Request</div>
      <NavItems />
      <UserCard />
    </aside>
  );
}
