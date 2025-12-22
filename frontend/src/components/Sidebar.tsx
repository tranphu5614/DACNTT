import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Variant = 'static' | 'offcanvas';

export default function Sidebar({ variant = 'static' }: { variant?: Variant }) {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  
  // Kiểm tra quyền quản lý (bao gồm cả role cũ và role mới MANAGER nếu có)
  const isManager = hasRole('ADMIN') || hasRole('MANAGER') || hasRole('HR_MANAGER') || hasRole('IT_MANAGER');

  const NavItems = () => (
    <>
      <div className="mb-2 small text-uppercase text-secondary">General</div>
      
      {/* --- MENU QUẢN LÝ --- */}
      {isManager && (
        <>
            <div className="mb-2 small text-uppercase text-secondary">Management</div>
            <ul className="list-group mb-3">
                {/* 1. Link Dashboard */}
                <li className="list-group-item p-0 border-0 bg-transparent">
                  <NavLink
                      to="/dashboard"
                      className={({ isActive }) =>
                      'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
                      }
                  >
                      <i className="bi bi-speedometer2 me-2"></i>
                      Dashboard
                  </NavLink>
                </li>

                {/* 2. Link Queues (Giữ nguyên logic cũ) */}
                {(hasRole('ADMIN') || hasRole('HR_MANAGER')) && (
                    <li className="list-group-item p-0 border-0 bg-transparent">
                    <NavLink
                        to="/queue/hr"
                        className={({ isActive }) =>
                        'list-group-item list-group-item-action rounded ' + (isActive ? 'active' : '')
                        }
                    >
                         <i className="bi bi-people me-2"></i>
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
                         <i className="bi bi-pc-display me-2"></i>
                        Hàng chờ IT
                    </NavLink>
                    </li>
                )}
            </ul>
        </>
      )}

      {/* --- MENU CÁ NHÂN --- */}
      <div className="mb-2 small text-uppercase text-secondary">Personal</div>
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

      {/* --- MENU ADMIN --- */}
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

  return (
    <aside className="p-3 sticky-top" style={{ top: 0 }}>
      <div className="h5 mb-3">Internal Request</div>
      <NavItems />
      <UserCard />
    </aside>
  );
}