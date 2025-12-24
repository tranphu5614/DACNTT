import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListUsers, apiDeleteUser, UserItem } from '../api/users'; // Import UserItem từ api/users để có đủ trường mới
import { Link } from 'react-router-dom';

export default function AdminUsersListPage() {
  const { token, user: me } = useAuth();
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / limit)), [total, limit]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiListUsers(token, { page, limit, search, role });
      setItems(res.items);
      setTotal(res.total);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Load users failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-line */ }, [page, limit]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await load();
  };

  const onDelete = async (id: string, email: string) => {
    if (!token) return;
    if (!confirm(`Xoá user "${email}"?`)) return;
    setDeletingId(id);
    try {
      await apiDeleteUser(token, id);
      if (me?._id === id) {
        alert('Bạn vừa xoá chính mình – hệ thống sẽ đăng xuất.');
        location.href = '/login';
        return;
      }
      await load();
    } catch (e: any) {
      console.error(e);
      alert(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">Quản lý nhân viên</h4>
        <Link to="/admin/users/create" className="btn btn-primary">
          <i className="bi bi-person-plus-fill me-2"></i>Thêm nhân viên
        </Link>
      </div>

      <form className="row g-2 align-items-end mb-3" onSubmit={onSearch}>
        <div className="col-sm-5 col-12">
          <label className="form-label">Tìm kiếm</label>
          <input
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên hoặc email..."
          />
        </div>
        <div className="col-sm-3 col-6">
          <label className="form-label">Vai trò</label>
          <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="IT_MANAGER">IT_MANAGER</option>
            <option value="HR_MANAGER">HR_MANAGER</option>
          </select>
        </div>
        <div className="col-sm-2 col-6">
          <label className="form-label">Hiển thị</label>
          <select className="form-select" value={limit} onChange={(e) => setLimit(parseInt(e.target.value, 10))}>
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/trang</option>)}
          </select>
        </div>
        <div className="col-sm-2 col-12 d-grid">
          <button className="btn btn-outline-primary" type="submit" disabled={loading}>
            <i className="bi bi-search me-1"></i> Tìm
          </button>
        </div>
      </form>

      <div className="table-responsive card shadow-sm">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Họ tên & Email</th>
              <th>Phòng ban</th>
              <th>SĐT</th>
              <th>Vai trò</th>
              <th className="text-end" style={{ width: 180 }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
            )}
            {items.map((u) => (
              <tr key={u._id}>
                <td>
                  <div className="fw-bold text-primary">
                    <Link to={`/admin/users/${u._id}`} className="text-decoration-none">{u.name}</Link>
                  </div>
                  <div className="text-muted small">{u.email}</div>
                </td>
                <td>
                  {u.department ? (
                    <span className="badge bg-light text-dark border">{u.department}</span>
                  ) : <span className="text-muted small">—</span>}
                </td>
                <td>{u.phoneNumber || <span className="text-muted small">—</span>}</td>
                <td>
                  <div className="d-flex flex-wrap gap-1">
                    {(u.roles || []).map((r) => (
                      <span key={r} className={`badge ${r === 'ADMIN' ? 'bg-danger' : r.includes('MANAGER') ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                        {r}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="text-end">
                  <Link 
                    to={`/admin/users/${u._id}`} 
                    className="btn btn-sm btn-outline-primary me-2"
                    title="Xem chi tiết & Phân quyền"
                  >
                    <i className="bi bi-gear-fill"></i> Chi tiết
                  </Link>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDelete(u._id, u.email)}
                    disabled={deletingId === u._id || loading}
                    title="Xóa nhân viên"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav aria-label="pagination" className="mt-3">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Trước</button>
            </li>
            <li className="page-item disabled">
              <span className="page-link">Trang {page}/{totalPages} — Tổng {total}</span>
            </li>
            <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage((p) => p + 1)}>Sau ›</button>
            </li>
          </ul>
        </nav>
      )}
    </>
  );
}