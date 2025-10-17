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
        <h4 className="mb-0">Users</h4>
        <Link to="/admin/users/create" className="btn btn-primary">+ Create user</Link>
      </div>

      <form className="row g-2 align-items-end mb-3" onSubmit={onSearch}>
        <div className="col-sm-5 col-12">
          <label className="form-label">Search</label>
          <input
            className="form-control"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên/email…"
          />
        </div>
        <div className="col-sm-3 col-6">
          <label className="form-label">Role</label>
          <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">All roles</option>
            <option value="USER">USER</option>
            <option value="ADMIN">ADMIN</option>
            <option value="IT_MANAGER">IT_MANAGER</option>
            <option value="HR_MANAGER">HR_MANAGER</option>
          </select>
        </div>
        <div className="col-sm-2 col-6">
          <label className="form-label">Limit</label>
          <select className="form-select" value={limit} onChange={(e) => setLimit(parseInt(e.target.value, 10))}>
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/page</option>)}
          </select>
        </div>
        <div className="col-sm-2 col-12 d-grid">
          <button className="btn btn-outline-primary" type="submit" disabled={loading}>Search</button>
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Email</th>
              <th>Name</th>
              <th>Roles</th>
              <th>Created</th>
              <th style={{ width: 160 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && !loading && (
              <tr><td colSpan={5} className="text-center">No data</td></tr>
            )}
            {items.map((u) => (
              <tr key={u._id}>
                <td>{u.email}</td>
                <td>{u.name}</td>
                <td className="text-nowrap">
                  {(u.roles || []).map((r) => (
                    <span key={r} className="badge text-bg-info me-1">{r}</span>
                  ))}
                </td>
                <td>{(u as any).createdAt ? new Date((u as any).createdAt).toLocaleString() : '—'}</td>
                <td>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => onDelete(u._id, u.email)}
                    disabled={deletingId === u._id || loading}
                  >
                    {deletingId === u._id ? 'Đang xoá…' : 'Xoá'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <nav aria-label="pagination">
        <ul className="pagination">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>‹ Prev</button>
          </li>
          <li className="page-item disabled">
            <span className="page-link">Page {page}/{totalPages} — {total} users</span>
          </li>
          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage((p) => p + 1)}>Next ›</button>
          </li>
        </ul>
      </nav>
    </>
  );
}
