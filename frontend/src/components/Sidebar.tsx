import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Variant = 'static' | 'offcanvas';

export default function Sidebar({ variant = 'static' }: { variant?: Variant }) {
  const { user, hasRole } = useAuth();
  
  const isAdmin = hasRole('ADMIN');
  const isManager = isAdmin || hasRole('MANAGER') || hasRole('HR_MANAGER') || hasRole('IT_MANAGER');

  // Component Link nội bộ để tái sử dụng style
  const MenuLink = ({ to, icon, label }: { to: string; icon: string; label: string }) => (
    <li className="nav-item w-100">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `nav-link d-flex align-items-center py-2 px-3 mb-1 rounded transition-all ${
            isActive 
              ? 'bg-primary text-white shadow-sm fw-medium' 
              : 'text-white-50 hover-text-white'
          }`
        }
        style={{ fontSize: '0.95rem' }}
      >
        <i className={`bi ${icon} me-3 fs-5 opacity-75`}></i>
        <span>{label}</span>
      </NavLink>
    </li>
  );

  const SectionTitle = ({ label }: { label: string }) => (
    <div className="text-uppercase small text-muted fw-bold mt-4 mb-2 ps-3" style={{ fontSize: '0.7rem', letterSpacing: '1px' }}>
      {label}
    </div>
  );

  // Nội dung chính của Sidebar (Dark Theme)
  const SidebarContent = () => (
    <div className="d-flex flex-column h-100 text-white">
      {/* BRAND / LOGO AREA */}
      <div className="d-flex align-items-center px-3 mb-4 flex-shrink-0">
        <div className="bg-white text-primary rounded d-flex align-items-center justify-content-center me-2" style={{width: 38, height: 38}}>
           <i className="bi bi-grid-3x3-gap-fill fs-4"></i>
        </div>
        <div>
          <div className="fw-bold fs-5 lh-1">Request</div>
          <small className="text-white-50" style={{fontSize: '0.7rem'}}>Internal System</small>
        </div>
      </div>

      <div className="flex-grow-1 overflow-auto custom-scrollbar px-2">
        <ul className="nav nav-pills flex-column">
          
          {/* 1. PERSONAL */}
          <MenuLink to="/requests/new" icon="bi-plus-circle-fill" label="Tạo yêu cầu" />
          <MenuLink to="/requests/mine" icon="bi-list-check" label="Yêu cầu của tôi" />
          <MenuLink to="/profile" icon="bi-person-circle" label="Hồ sơ cá nhân" />

          {/* 2. MANAGEMENT */}
          {isManager && (
            <>
              <SectionTitle label="Quản lý" />
              <MenuLink to="/dashboard" icon="bi-speedometer2" label="Tổng quan" />
              
              {(isAdmin || hasRole('HR_MANAGER')) && (
                 <MenuLink to="/queue/hr" icon="bi-people-fill" label="Hàng chờ HR" />
              )}
              
              {(isAdmin || hasRole('IT_MANAGER')) && (
                 <MenuLink to="/queue/it" icon="bi-pc-display" label="Hàng chờ IT" />
              )}
            </>
          )}

          {/* 3. ADMIN */}
          {isAdmin && (
            <>
               <SectionTitle label="Hệ thống" />
               <MenuLink to="/admin/users" icon="bi-people-fill" label="Người dùng" />
               <MenuLink to="/admin/users/create" icon="bi-person-plus-fill" label="Thêm User" />
            </>
          )}
        </ul>
      </div>

      {/* USER FOOTER */}
      <div className="mt-auto pt-3 border-top border-secondary px-2 flex-shrink-0">
        <div className="dropdown">
          <a href="#" className="d-flex align-items-center text-white text-decoration-none dropdown-toggle p-2 rounded hover-bg-dark-light" data-bs-toggle="dropdown" aria-expanded="false">
            <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2 border border-2 border-dark" style={{ width: 32, height: 32 }}>
               {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
               <div className="fw-bold text-truncate" style={{maxWidth: 140}}>{user?.name || 'User'}</div>
               <div className="small text-white-50 text-truncate" style={{fontSize: '0.75rem'}}>{user?.email}</div>
            </div>
          </a>
          <ul className="dropdown-menu dropdown-menu-dark shadow">
            <li><NavLink className="dropdown-item" to="/profile">Cài đặt tài khoản</NavLink></li>
            <li><hr className="dropdown-divider" /></li>
            <li>
                <button className="dropdown-item text-danger" onClick={() => {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }}>
                    <i className="bi bi-box-arrow-right me-2"></i> Đăng xuất
                </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  // --- RENDER ---
  
  // 1. Mobile Offcanvas Render
  if (variant === 'offcanvas') {
    return (
      <div className="offcanvas offcanvas-start bg-dark" tabIndex={-1} id="appSidebar" aria-labelledby="appSidebarLabel">
        <div className="offcanvas-header border-bottom border-secondary">
          <h5 className="offcanvas-title text-white" id="appSidebarLabel">Menu</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close" />
        </div>
        <div className="offcanvas-body p-3">
          <SidebarContent />
        </div>
      </div>
    );
  }

  // 2. Desktop Static Render
  return (
    <aside 
        className="d-none d-lg-block bg-dark text-white p-3 sticky-top h-100" 
        style={{ width: 260, minHeight: '100vh', top: 0 }}
    >
      <SidebarContent />
    </aside>
  );
}