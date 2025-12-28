import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

type Variant = 'static' | 'offcanvas';

// Standard Odoo Dark Theme Colors
const THEME = {
  BG: '#1e2327',           
  ACTIVE_BG: '#2a3036',    
  ACTIVE_BORDER: '#008784',
  TEXT_MAIN: '#e9ecef',
  TEXT_MUTED: '#adb5bd'
};

export default function Sidebar({ variant = 'static' }: { variant?: Variant }) {
  const { user, hasRole } = useAuth();
  
  const isAdmin = hasRole('ADMIN');
  const isManager = isAdmin || hasRole('MANAGER') || hasRole('HR_MANAGER') || hasRole('IT_MANAGER');

  // --- ITEM COMPONENT ---
  const MenuLink = ({ to, icon, label }: { to: string; icon: string; label: string }) => (
    <li className="nav-item w-100">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `nav-link d-flex align-items-center py-2 px-3 rounded-0 transition-all ${
            isActive ? 'active-item' : 'text-white-50 hover-text-white'
          }`
        }
        style={({ isActive }) => ({
            fontSize: '0.9rem',
            color: isActive ? THEME.TEXT_MAIN : undefined,
            backgroundColor: isActive ? THEME.ACTIVE_BG : 'transparent',
            borderLeft: isActive ? `4px solid ${THEME.ACTIVE_BORDER}` : '4px solid transparent',
            paddingLeft: isActive ? '12px' : '16px' 
        })}
      >
        <i className={`bi ${icon} me-3 fs-6 ${!window.location.pathname.includes(to) ? 'opacity-75' : ''}`}></i>
        <span className="fw-medium">{label}</span>
      </NavLink>
    </li>
  );

  const SectionTitle = ({ label }: { label: string }) => (
    <div className="text-uppercase fw-bold mt-4 mb-2 ps-3 small" style={{ fontSize: '0.65rem', letterSpacing: '1px', color: '#6c757d' }}>
      {label}
    </div>
  );

  // --- CONTENT (Flex Column for internal scrolling) ---
  const SidebarContent = () => (
    <div className="d-flex flex-column h-100 text-white">
      
      {/* 1. HEADER */}
      <div className="d-flex align-items-center px-3 py-3 flex-shrink-0" style={{height: 60, borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
        <div className="rounded d-flex align-items-center justify-content-center me-2" 
             style={{width: 32, height: 32, backgroundColor: THEME.ACTIVE_BORDER}}>
            <i className="bi bi-grid-fill text-white fs-6"></i>
        </div>
        <div>
          <div className="fw-bold fs-6 lh-1 tracking-tight">Internal Portal</div>
        </div>
      </div>

      {/* 2. MENU LIST (Scrolling area) */}
      <div className="flex-grow-1 overflow-y-auto custom-scrollbar py-2" style={{ scrollbarWidth: 'thin', scrollbarColor: '#495057 transparent' }}>
        <ul className="nav flex-column mb-0">
          
          <SectionTitle label="Personal" />
          <MenuLink to="/dashboard" icon="bi-speedometer2" label="Overview" />
          <MenuLink to="/requests/new" icon="bi-plus-circle" label="New Request" />
          <MenuLink to="/requests/mine" icon="bi-list-task" label="My Requests" />
          <MenuLink to="/profile" icon="bi-person-gear" label="My Profile" />

          {isManager && (
            <>
              <SectionTitle label="Management" />
              {(isAdmin || hasRole('HR_MANAGER')) && <MenuLink to="/queue/hr" icon="bi-people" label="HR Queue" />}
              {(isAdmin || hasRole('IT_MANAGER')) && <MenuLink to="/queue/it" icon="bi-pc-display" label="IT Queue" />}
            </>
          )}

          {isAdmin && (
            <>
                <SectionTitle label="System" />
                <MenuLink to="/admin/users" icon="bi-people-fill" label="Employees" />
                <MenuLink to="/admin/settings" icon="bi-gear-fill" label="Settings" />
            </>
          )}
          
          {/* Spacer to ensure last item isn't cut off */}
          <div style={{height: 20}}></div> 
        </ul>
      </div>

      {/* 3. USER FOOTER */}
      <div className="mt-auto p-3 flex-shrink-0" style={{borderTop: '1px solid rgba(255,255,255,0.05)'}}>
        <div className="dropdown w-100">
          <a href="#" className="d-flex align-items-center text-white text-decoration-none dropdown-toggle p-2 rounded hover-bg-white-10" data-bs-toggle="dropdown">
            <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center me-2 text-white small fw-bold" 
                 style={{ width: 32, height: 32 }}>
               {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden flex-grow-1">
               <div className="fw-bold text-truncate small lh-1 mb-1">{user?.name || 'User'}</div>
               <div className="text-white-50 text-truncate" style={{fontSize: '0.7rem'}}>Online</div>
            </div>
          </a>
          <ul className="dropdown-menu dropdown-menu-dark shadow-lg border-0 mb-2 w-100">
            <li><NavLink className="dropdown-item small" to="/profile"><i className="bi bi-person me-2"></i>Profile</NavLink></li>
            <li><hr className="dropdown-divider border-secondary border-opacity-50" /></li>
            <li>
                <button className="dropdown-item text-danger small" onClick={() => {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }}>
                    <i className="bi bi-box-arrow-right me-2"></i> Logout
                </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );

  // --- RENDER ---

  // 1. Mobile Offcanvas
  if (variant === 'offcanvas') {
    return (
      <div className="offcanvas offcanvas-start border-0 text-white" tabIndex={-1} id="appSidebar" 
           style={{backgroundColor: THEME.BG, width: 260}}>
        <div className="offcanvas-body p-0">
          <SidebarContent />
        </div>
      </div>
    );
  }

  // 2. Desktop Static (FIXED POSITION)
  return (
    <aside 
        className="d-none d-lg-block shadow-sm"
        style={{ 
            position: 'fixed', // IMPORTANT: Fixed position
            top: 0,
            left: 0,
            bottom: 0,
            width: 260, 
            height: '100vh', // Height is 100% viewport height
            backgroundColor: THEME.BG,
            zIndex: 1040, // Ensure it's above other elements if needed
            overflow: 'hidden' // Hide scrollbar of outer frame
        }}
    >
      <SidebarContent />
    </aside>
  );
}