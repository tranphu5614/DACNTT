import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiListUsers, apiDeleteUser, UserItem } from '../api/users';
import { Link } from 'react-router-dom';

export default function AdminUsersListPage() {
  const { token, user: me } = useAuth();
  
  // State
  const [items, setItems] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  // [FIX] Bỏ setLimit khỏi destructuring vì không dùng
  const [limit] = useState(20); 
  
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, limit, role]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  const onDelete = async (id: string, email: string) => {
    if (!token || !confirm(`Xoá nhân viên "${email}"? Hành động này không thể hoàn tác.`)) return;
    setDeletingId(id);
    try {
      await apiDeleteUser(token, id);
      if (me?._id === id) {
        window.location.href = '/login';
        return;
      }
      await load();
    } catch (e: any) {
      alert(e?.message || 'Xóa thất bại');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper render Avatar
  const UserAvatar = ({ name }: { name: string }) => (
    <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold border border-primary-subtle" 
         style={{width: 36, height: 36, fontSize: '0.9rem'}}>
        {name?.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* 1. CONTROL PANEL */}
      <div className="o_control_panel bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 99, height: 60}}>
        <div>
           <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item text-muted text-uppercase">Cấu hình</li>
              <li className="breadcrumb-item active fw-bold text-primary" aria-current="page">Nhân viên</li>
            </ol>
          </nav>
        </div>

        <div className="d-flex gap-2 align-items-center">
            {/* Search */}
            <form onSubmit={handleSearch} className="input-group input-group-sm" style={{ width: 220 }}>
                <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-search"></i></span>
                <input 
                    className="form-control border-start-0 ps-0" 
                    placeholder="Tìm tên, email..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </form>

            {/* Filter Role */}
            <select className="form-select form-select-sm" style={{width: 140}} value={role} onChange={(e) => setRole(e.target.value)}>
               <option value="">-- Tất cả vai trò --</option>
               <option value="USER">User</option>
               <option value="ADMIN">Admin</option>
               <option value="IT_MANAGER">IT Manager</option>
               <option value="HR_MANAGER">HR Manager</option>
            </select>

            {/* Pagination Controls in Header */}
            <div className="btn-group btn-group-sm">
                <button className="btn btn-outline-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
                <span className="btn btn-outline-secondary disabled border-start-0 border-end-0 bg-white text-muted">
                    {page} / {totalPages}
                </span>
                <button className="btn btn-outline-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
            </div>

            <div className="vr mx-1"></div>

            <Link to="/admin/users/create" className="btn btn-sm btn-primary text-nowrap shadow-sm">
               <i className="bi bi-person-plus-fill me-2"></i> Thêm mới
            </Link>
        </div>
      </div>

      {/* 2. MAIN LIST */}
      <div className="flex-grow-1 p-4 overflow-hidden d-flex flex-column">
        <div className="card shadow-sm border-0 h-100 d-flex flex-column">
            <div className="table-responsive flex-grow-1">
                <table className="table table-hover mb-0 align-middle text-nowrap">
                    <thead className="bg-light sticky-top" style={{top: 0, zIndex: 5}}>
                        <tr>
                            <th className="border-0 text-muted small text-uppercase ps-4">Họ tên & Email</th>
                            <th className="border-0 text-muted small text-uppercase">Phòng ban</th>
                            <th className="border-0 text-muted small text-uppercase">Vai trò</th>
                            <th className="border-0 text-muted small text-uppercase text-end pe-4">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading && items.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-5 text-muted">Đang tải dữ liệu...</td></tr>
                        )}
                        {!loading && items.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-5 text-muted">Không tìm thấy nhân viên nào</td></tr>
                        )}
                        {items.map((u) => (
                            <tr key={u._id} className="cursor-pointer">
                                <td className="ps-4 py-3">
                                    <div className="d-flex align-items-center">
                                        <UserAvatar name={u.name} />
                                        <div className="ms-3">
                                            <Link to={`/admin/users/${u._id}`} className="fw-bold text-dark text-decoration-none hover-text-primary">
                                                {u.name}
                                            </Link>
                                            <div className="text-muted small">{u.email}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    {u.department ? (
                                        <span className="badge bg-light text-secondary border px-2 py-1">
                                            <i className="bi bi-building me-1"></i> {u.department}
                                        </span>
                                    ) : <span className="text-muted small fst-italic">-</span>}
                                </td>
                                <td>
                                    {(u.roles || []).map(r => (
                                        <span key={r} className={`badge me-1 border ${
                                            r === 'ADMIN' ? 'bg-danger-subtle text-danger border-danger-subtle' : 
                                            r.includes('MANAGER') ? 'bg-warning-subtle text-dark border-warning-subtle' : 
                                            'bg-info-subtle text-info-emphasis border-info-subtle'
                                        }`}>
                                            {r}
                                        </span>
                                    ))}
                                </td>
                                <td className="text-end pe-4">
                                    <Link to={`/admin/users/${u._id}`} className="btn btn-sm btn-light border me-2 text-primary" title="Chỉnh sửa">
                                        <i className="bi bi-pencil-square"></i>
                                    </Link>
                                    <button 
                                        className="btn btn-sm btn-light border text-danger" 
                                        onClick={() => onDelete(u._id, u.email)}
                                        disabled={deletingId === u._id}
                                        title="Xóa"
                                    >
                                        {deletingId === u._id ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-trash"></i>}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Footer Summary */}
            <div className="card-footer bg-white py-2 border-top d-flex justify-content-between align-items-center">
                <div className="text-muted small">
                    Tổng số: <strong>{total}</strong> nhân viên
                </div>
                <div className="text-muted small">
                    Hiển thị <strong>{items.length}</strong> bản ghi trên trang này
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}