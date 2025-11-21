import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';
import RequireAdmin from './routes/RequireAdmin';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import RequestNewPage from './pages/NewRequestPage';
import MyRequestsPage from './pages/MyRequestsPage';
import AdminUsersListPage from './pages/AdminUsersListPage';
import AdminUsersPage from './pages/AdminUsersPage';
import RequireRoles from './routes/RequireRoles';
import RequestsQueuePage from './pages/RequestsQueuePage';

// 👇 thêm
import RequestsToApprove from './pages/RequestsToApprove';
import RequestDetail from './pages/RequestDetail';

export default function App() {
  const { token, user, logout } = useAuth();

  // Chưa đăng nhập
  if (!token) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
            <Routes>
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    );
  }

  // Đã đăng nhập
  return (
    <div className="container-fluid p-0">
      {/* Top navbar */}
      <nav className="navbar navbar-expand bg-body-tertiary border-bottom sticky-top">
        <div className="container-fluid">
          <button
            className="btn btn-outline-secondary d-lg-none me-2"
            type="button"
            data-bs-toggle="offcanvas"
            data-bs-target="#appSidebar"
            aria-controls="appSidebar"
          >
            ☰
          </button>

          <span className="navbar-brand mb-0 h1">Internal Request</span>

          <div className="ms-auto d-flex align-items-center gap-2">
            <span className="text-secondary d-none d-sm-inline">Hi, {user?.name}</span>
            <button className="btn btn-outline-danger btn-sm" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="row g-0">
        <div className="col-lg-2 d-none d-lg-block border-end">
          <Sidebar variant="static" />
        </div>

        <div className="col-12 col-lg-10 p-4 bg-light min-vh-100">
          <Routes>
            {/* Logged-in area */}
            <Route element={<ProtectedRoute />}>
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/requests/new" element={<RequestNewPage />} />
              <Route path="/requests/mine" element={<MyRequestsPage />} />
              {/* 👇 request chờ tôi duyệt */}
              <Route path="/requests/pending" element={<RequestsToApprove />} />
              {/* 👇 chi tiết 1 request */}
              <Route path="/requests/:id" element={<RequestDetail />} />

              <Route
                path="/queue/hr"
                element={
                  <RequireRoles anyOf={['ADMIN', 'HR_MANAGER']}>
                    <RequestsQueuePage category="HR" />
                  </RequireRoles>
                }
              />
              <Route
                path="/queue/it"
                element={
                  <RequireRoles anyOf={['ADMIN', 'IT_MANAGER']}>
                    <RequestsQueuePage category="IT" />
                  </RequireRoles>
                }
              />
            </Route>

            {/* Admin-only */}
            <Route
              path="/admin/users"
              element={
                <RequireAdmin>
                  <AdminUsersListPage />
                </RequireAdmin>
              }
            />
            <Route
              path="/admin/users/create"
              element={
                <RequireAdmin>
                  <AdminUsersPage />
                </RequireAdmin>
              }
            />

            {/* Redirects */}
            <Route path="/" element={<Navigate to="/profile" replace />} />
            <Route path="*" element={<Navigate to="/profile" replace />} />
          </Routes>
        </div>
      </div>

      {/* Offcanvas sidebar (mobile) */}
      <Sidebar variant="offcanvas" />
    </div>
  );
}
