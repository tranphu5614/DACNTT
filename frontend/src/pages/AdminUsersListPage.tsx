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
    // English confirmation message
    if (!token || !confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) return;
    
    setDeletingId(id);
    try {
      await apiDeleteUser(token, id);
      if (me?._id === id) {
        window.location.href = '/login';
        return;
      }
      await load();
    } catch (e: any) {
      // English error message
      alert(e?.message || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper render Avatar
  const UserAvatar = ({ name }: { name: string }) => (
    <div className="rounded-circle bg-primary-subtle text-primary d-flex align-items-center justify-content-center fw-bold border border-primary-subtle" 
         style={{width: 32, height: 32, fontSize: '0.85rem'}}>
        {name?.charAt(0).toUpperCase()}
    </div>
  );

  return (
    <div className="d-flex flex-column h-100 bg-white"> {/* Full white background */}
      
      {/* 1. CONTROL PANEL (Sticky Header) */}
      <div className="border-bottom px-3 py-2 d-flex justify-content-between align-items-center bg-white sticky-top" style={{zIndex: 100, height: 56}}>
        
        {/* Breadcrumb Left */}
        <div className="d-flex align-items-center gap-3">
            <h5 className="mb-0 fw-bold text-dark">Users</h5>
            <div className="vr h-50 mx-1"></div>
            <span className="text-muted small">Account Management & Permissions</span>
        </div>

        {/* Tools Right (Search, Filter, Actions) */}
        <div className="d-flex gap-2 align-items-center">
            {/* Search */}
            <form onSubmit={handleSearch} className="input-group input-group-sm" style={{ width: 200 }}>
                <span className="input-group-text bg-light border-end-0 text-muted"><i className="bi bi-search"></i></span>
                <input 
                    className="form-control bg-light border-start-0 ps-0" 
                    placeholder="Search..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </form>

            {/* Filter Role */}
            <select className="form-select form-select-sm bg-light" style={{width: 130}} value={role} onChange={(e) => setRole(e.target.value)}>
               <option value="">All Roles</option>
               <option value="USER">User</option>
               <option value="ADMIN">Admin</option>
               <option value="IT_MANAGER">IT Manager</option>
               <option value="HR_MANAGER">HR Manager</option>
            </select>

            {/* Pagination Controls */}
            <div className="btn-group btn-group-sm">
                <button className="btn btn-light border" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><i className="bi bi-chevron-left"></i></button>
                <span className="btn btn-light border disabled text-dark fw-semibold" style={{minWidth: '60px'}}>
                    {page} / {totalPages}
                </span>
                <button className="btn btn-light border" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><i className="bi bi-chevron-right"></i></button>
            </div>

            <Link to="/admin/users/create" className="btn btn-sm btn-primary fw-bold text-nowrap shadow-sm ms-2" style={{ backgroundColor: '#008784', borderColor: '#008784' }}>
               <i className="bi bi-plus-lg me-1"></i> Create New
            </Link>
        </div>
      </div>

      {/* 2. MAIN LIST (Full Height & Width) */}
      <div className="flex-grow-1 overflow-auto">
        <table className="table table-hover mb-0 align-middle text-nowrap w-100">
            <thead className="bg-light sticky-top" style={{top: 0, zIndex: 5}}>
                <tr>
                    <th className="border-bottom py-2 ps-3 text-secondary small fw-bold text-uppercase" style={{width: '250px'}}>User</th>
                    <th className="border-bottom py-2 text-secondary small fw-bold text-uppercase">Email</th>
                    <th className="border-bottom py-2 text-secondary small fw-bold text-uppercase">Department</th>
                    <th className="border-bottom py-2 text-secondary small fw-bold text-uppercase">Role</th>
                    <th className="border-bottom py-2 text-secondary small fw-bold text-uppercase">Status</th>
                    <th className="border-bottom py-2 pe-3 text-secondary small fw-bold text-uppercase text-end">Actions</th>
                </tr>
            </thead>
            <tbody>
                {loading && items.length === 0 && (
                    <tr><td colSpan={6} className="text-center py-5 text-muted">Loading data...</td></tr>
                )}
                {!loading && items.length === 0 && (
                    <tr>
                        <td colSpan={6} className="text-center py-5 text-muted">
                            <i className="bi bi-people fs-1 d-block mb-2 opacity-50"></i>
                            No users found
                        </td>
                    </tr>
                )}
                {items.map((u) => (
                    <tr key={u._id} className="cursor-pointer border-bottom-0">
                        <td className="ps-3 py-2">
                            <div className="d-flex align-items-center">
                                <UserAvatar name={u.name} />
                                <Link to={`/admin/users/${u._id}`} className="ms-3 fw-semibold text-dark text-decoration-none hover-text-primary">
                                    {u.name}
                                </Link>
                            </div>
                        </td>
                        <td className="py-2 text-muted small">{u.email}</td>
                        <td className="py-2">
                            {u.department ? (
                                <span className="badge bg-light text-dark border fw-normal">
                                    {u.department}
                                </span>
                            ) : <span className="text-muted small">-</span>}
                        </td>
                        <td className="py-2">
                            {(u.roles || []).map(r => (
                                <span key={r} className={`badge me-1 border fw-normal ${
                                    r === 'ADMIN' ? 'bg-danger-subtle text-danger border-danger-subtle' : 
                                    r.includes('MANAGER') ? 'bg-warning-subtle text-dark border-warning-subtle' : 
                                    'bg-info-subtle text-info-emphasis border-info-subtle'
                                }`}>
                                    {r}
                                </span>
                            ))}
                        </td>
                        <td className="py-2">
                             {/* Simulated status */}
                             <span className="badge bg-success-subtle text-success border border-success-subtle fw-normal rounded-pill">
                                 Active
                             </span>
                        </td>
                        <td className="text-end pe-3 py-2">
                            <div className="btn-group">
                                <Link to={`/admin/users/${u._id}`} className="btn btn-sm btn-light text-muted border-0 hover-bg-gray" title="Edit">
                                    <i className="bi bi-pencil"></i>
                                </Link>
                                <button 
                                    className="btn btn-sm btn-light text-danger border-0 hover-bg-gray" 
                                    onClick={() => onDelete(u._id, u.email)}
                                    disabled={deletingId === u._id}
                                    title="Delete"
                                >
                                    {deletingId === u._id ? <span className="spinner-border spinner-border-sm" style={{width: '0.8rem', height: '0.8rem'}}></span> : <i className="bi bi-trash"></i>}
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>

      {/* 3. FOOTER INFO */}
      <div className="border-top px-3 py-1 bg-light d-flex justify-content-between align-items-center" style={{fontSize: '0.75rem'}}>
         <div className="text-muted">Total: <strong>{total}</strong> records</div>
         <div className="text-muted">Showing {items.length} results</div>
      </div>

    </div>
  );
}