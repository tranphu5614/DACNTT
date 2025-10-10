import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import RequireAdmin from './routes/RequireAdmin';
import AdminUsersPage from './pages/AdminUsersPage';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <>
      <Header />
      <main className="container">
        <Routes>
          {/* Không có HomePage -> redirect "/" sang /login (hoặc /profile nếu bạn muốn) */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          {/* Chỉ admin */}
          <Route
            path="/admin/users"
            element={
              <RequireAdmin>
                <AdminUsersPage />
              </RequireAdmin>
            }
          />

          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </main>
    </>
  );
}
