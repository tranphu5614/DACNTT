import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListUsers, apiDeleteUser } from '../api/users';
import { User } from '../types';
import { Link } from 'react-router-dom';

export default function AdminUsersListPage() {
  const { token, user: me } = useAuth();
  const [items, setItems] = useState<User[]>([]);
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
      alert(e?.message || 'Load users failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [page, limit]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await load();
  };

  const onDelete = async (id: string, email: string) => {
    if (!token) return;
    if (!confirm(`Bạn có chắc muốn xoá "${email}"?`)) return;

    setDeletingId(id);
    try {
      await apiDeleteUser(token, id);

      if (me?._id === id) {
        alert('Bạn vừa xoá tài khoản của chính mình — hệ thống sẽ đăng xuất.');
        location.href = '/login';
        return;
      }

      await load();
    } catch (e: any) {
      alert(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      {/* TITLE + CREATE BUTTON */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <h3 className="fw-bold mb-0">Quản lý người dùng</h3>
        <Link to="/admin/users/create" className="btn btn-primary shadow-sm px-3">
          <i className="bi bi-person-plus me-1"></i> Tạo user
        </Link>
      </div>

      {/* FILTER PANEL */}
      <form className="row g-3 mb-4 bg-light p-3 rounded border" onSubmit={onSearch}>

        <div className="col-sm-5 col-12">
          <label className="form-label fw-semibold">Tìm kiếm</label>
          <input
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tên, email..."
          />
        </div>

        <div className="col-sm-3 col-6">
          <label className="form-label fw-semibold">Vai trò</label>
          <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Tất cả</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="IT_MANAGER">IT_MANAGER</option>
            <option value="HR_MANAGER">HR_MANAGER</option>
          </select>
        </div>

        <div className="col-sm-2 col-6">
          <label className="form-label fw-semibold">Limit</label>
          <select className="form-select" value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[10, 20, 50].map((v) => <option key={v} value={v}>{v}/page</option>)}
          </select>
        </div>

        <div className="col-sm-2 col-12 d-grid">
          <button className="btn btn-outline-primary" type="submit" disabled={loading}>
            <i className="bi bi-search"></i> Tìm
          </button>
        </div>
      </form>

      {/* USERS TABLE */}
      <div className="table-responsive shadow-sm rounded">
        <table className="table table-hover align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>Email</th>
              <th>Tên</th>
              <th>Vai trò</th>
              <th>Ngày tạo</th>
              <th className="text-center" style={{ width: 120 }}>Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center py-4">Không có dữ liệu</td></tr>
            )}

            {items.map((u) => (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td className="text-nowrap">
                  {(u.roles || []).map((r) => (
                    <span key={r} className="badge text-bg-info me-1 px-2 py-1">
                      {r}
                    </span>
                  ))}
                </td>
                <td>
                  {u.createdAt ? new Date(u.createdAt as any).toLocaleDateString() : '—'}
                </td>

                <td className="text-center">
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDelete(u._id, u.email)}
                    disabled={deletingId === u._id}
                  >
                    {deletingId === u._id
                      ? 'Đang xoá…'
                      : <i className="bi bi-trash"></i>}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <nav className="mt-3">
        <ul className="pagination justify-content-center">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(page - 1)}>
              ‹ Prev
            </button>
          </li>

          <li className="page-item disabled">
            <span className="page-link">
              Trang {page}/{totalPages} — {total} users
            </span>
          </li>

          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage(page + 1)}>
              Next ›
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
