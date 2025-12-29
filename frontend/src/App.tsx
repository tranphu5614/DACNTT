import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import RequireAdmin from './routes/RequireAdmin';
import RequireRoles from './routes/RequireRoles';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import ProfilePage from './pages/ProfilePage';
import RequestNewPage from './pages/NewRequestPage';
import MyRequestsPage from './pages/MyRequestsPage';
import AssignedTasksPage from './pages/AssignedTasksPage';
import AdminUsersListPage from './pages/AdminUsersListPage';
import AdminUsersPage from './pages/AdminUsersPage';
import UserDetailPage from './pages/UserDetailPage';
import RequestsQueuePage from './pages/RequestsQueuePage';
import RequestsToApprove from './pages/RequestsToApprove';
import RequestDetail from './pages/RequestDetail';
import Dashboard from './pages/Dashboard';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import WorkflowConfigPage from './pages/WorkflowConfigPage';

// CRM Pages
import CrmPage from './pages/CrmPage';
import CrmDetailPage from './pages/CrmDetailPage';
import PublicContactPage from './pages/PublicContactPage';

// Components
import Chatbot from './components/Chatbot';

// --- [MỚI] COMPONENT BẢO VỆ RIÊNG CHO SALES ---
// Cho phép truy cập nếu là Admin/Manager HOẶC nhân viên thuộc phòng ban SALE/SALES
const RequireSales = ({ children }: { children: JSX.Element }) => {
  const { user, hasRole } = useAuth();

  const canAccess = 
    hasRole('ADMIN') || 
    hasRole('SALE_MANAGER') || 
    hasRole('SALE_STAFF') || 
    (user?.department && ['SALE', 'SALES'].includes(user.department.toUpperCase()));

  if (!canAccess) {
    return <Navigate to="/profile" replace />;
  }
  return children;
};

// --- LAYOUT CON ---
const AuthLayout = () => {
  return (
    <div className="container-fluid min-vh-100 d-flex align-items-center justify-content-center py-5 bg-light">
      <div className="w-100 d-flex justify-content-center px-3"> 
         <Outlet />
      </div>
    </div>
  );
};

export default function App() {
  const { token, user, logout } = useAuth();

  // 1. CHƯA ĐĂNG NHẬP
  if (!token) {
    return (
      <Routes>
        {/* Route Public cho khách hàng */}
        <Route path="/contact-us" element={<PublicContactPage />} />

        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  // 2. ĐÃ ĐĂNG NHẬP
  return (
    <div className="d-flex flex-column min-vh-100 bg-light">
      {/* Navbar Top */}
      <nav className="navbar navbar-expand-lg bg-white border-bottom sticky-top shadow-sm px-3">
        <div className="container-fluid">
          <button className="btn btn-outline-secondary d-lg-none me-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#appSidebar">
            <i className="bi bi-list"></i>
          </button>
          
          <span className="navbar-brand fw-bold text-primary mb-0 h1">
            <i className="bi bi-grid-3x3-gap-fill me-2"></i>Internal Request
          </span>

          <div className="ms-auto d-flex align-items-center gap-3">
            <div className="d-none d-sm-block text-end">
                <div className="fw-bold small">{user?.name}</div>
                <div className="text-muted" style={{fontSize: '0.75rem'}}>{user?.email}</div>
            </div>
            <button className="btn btn-outline-danger btn-sm rounded-pill px-3" onClick={logout}>
              <i className="bi bi-box-arrow-right me-1"></i> Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-grow-1 d-flex flex-row overflow-hidden">
        
        {/* Sidebar Desktop */}
        <div className="d-none d-lg-block border-end bg-white" style={{ width: '260px', flexShrink: 0 }}>
          <Sidebar variant="static" />
        </div>

        {/* Dynamic Content */}
        <div className="flex-grow-1 p-4 overflow-auto" style={{ height: 'calc(100vh - 60px)' }}>
          <Routes>
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            
            {/* Route này để user login rồi vẫn xem được trang contact (để test) */}
            <Route path="/contact-us" element={<PublicContactPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/requests/new" element={<RequestNewPage />} />
              <Route path="/requests/mine" element={<MyRequestsPage />} />
              <Route path="/tasks" element={<AssignedTasksPage />} />
              
              <Route path="/requests/pending" element={<RequestsToApprove />} />
              <Route path="/requests/:id" element={<RequestDetail />} />
              
              {/* [CẬP NHẬT] Sử dụng RequireSales thay vì RequireRoles */}
              <Route 
                 path="/crm" 
                 element={
                    <RequireSales>
                        <CrmPage />
                    </RequireSales>
                 } 
              />
              
              <Route 
                 path="/crm/:id" 
                 element={
                    <RequireSales>
                        <CrmDetailPage />
                    </RequireSales>
                 } 
              />
              
              <Route 
                path="/dashboard" 
                element={
                  <RequireRoles anyOf={['ADMIN', 'MANAGER', 'HR_MANAGER', 'IT_MANAGER']}>
                    <Dashboard />
                  </RequireRoles>
                } 
              />

              <Route path="/queue/hr" element={<RequireRoles anyOf={['ADMIN', 'HR_MANAGER']}><RequestsQueuePage category="HR" /></RequireRoles>} />
              <Route path="/queue/it" element={<RequireRoles anyOf={['ADMIN', 'IT_MANAGER']}><RequestsQueuePage category="IT" /></RequireRoles>} />
            </Route>

            {/* Admin Routes */}
            <Route path="/admin/users" element={<RequireAdmin><AdminUsersListPage /></RequireAdmin>} />
            <Route path="/admin/users/create" element={<RequireAdmin><AdminUsersPage /></RequireAdmin>} />
            <Route path="/admin/users/:id" element={<RequireAdmin><UserDetailPage /></RequireAdmin>} />
            
            <Route path="/admin/workflows" element={<RequireAdmin><WorkflowConfigPage /></RequireAdmin>} />

            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </div>
      </div>

      <Sidebar variant="offcanvas" />
      <Chatbot />
    </div>
  );
}