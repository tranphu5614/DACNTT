import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiQueueRequests } from '../api/requests';

type ViewMode = 'list' | 'kanban';

// Helper to format relative time
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString('en-US');
};

export default function RequestsQueuePage({ category }: { category: 'HR' | 'IT' }) {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [q, setQ] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterAssigned, setFilterAssigned] = useState('ALL'); 
  
  const [page, setPage] = useState(1);
  const [limit] = useState(100);

  const kanbanColumns = [
    { id: 'NEW', title: 'New', color: 'border-secondary', bg: 'bg-light' },
    { id: 'PENDING', title: 'Pending Approval', color: 'border-warning', bg: 'bg-warning-subtle' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-primary', bg: 'bg-primary-subtle' },
    { id: 'COMPLETED', title: 'Completed', color: 'border-success', bg: 'bg-success-subtle' }
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await apiQueueRequests(token!, { 
        category, page, limit, q,
        priority: filterPriority || undefined 
      });
      setItems(res.items);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadData(); }, [token, category, page, limit, filterPriority]);

  const handleSearch = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { setPage(1); loadData(); }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
        if (filterAssigned === 'ME') return item.assignedTo?._id === user?._id;
        if (filterAssigned === 'UNASSIGNED') return !item.assignedTo;
        return true;
    });
  }, [items, filterAssigned, user]);

  // --- RENDER HELPERS ---
  const PriorityBadge = ({ p }: { p: string }) => {
    const map: any = { 
        'URGENT': { label: 'Urgent', color: 'danger' },
        'HIGH': { label: 'High', color: 'warning text-dark' },
        'MEDIUM': { label: 'Medium', color: 'info text-dark' },
        'LOW': { label: 'Low', color: 'secondary' }
    };
    const conf = map[p] || map['LOW'];
    return <span className={`badge bg-${conf.color}-subtle text-${conf.color} border border-${conf.color}-subtle ms-1 fw-normal`} style={{fontSize: '0.65rem'}}>{conf.label}</span>;
  };

  const AssigneeAvatar = ({ user }: { user?: any }) => {
      if (!user) return (
        <div className="rounded-circle bg-light text-muted border d-flex align-items-center justify-content-center" 
             style={{width: 24, height: 24, fontSize: '0.65rem'}} title="Unassigned">
            <i className="bi bi-person"></i>
        </div>
      );
      return (
        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center border border-white shadow-sm" 
             style={{width: 24, height: 24, fontSize: '0.65rem'}} title={`Assigned to: ${user.name}`}>
            {user.name?.[0]?.toUpperCase()}
        </div>
      );
  };

  return (
    <div className="h-100 d-flex flex-column bg-white">
      
      {/* 1. CONTROL PANEL (Filter Bar) - Sticky */}
      <div className="border-bottom px-4 py-2 flex-shrink-0 sticky-top bg-white" style={{zIndex: 100, height: 56}}>
        <div className="d-flex justify-content-between align-items-center h-100">
            
            {/* Left: Breadcrumb + Title */}
            <div className="d-flex align-items-center gap-3">
               <h6 className="fw-bold text-dark m-0 text-uppercase">{category === 'HR' ? 'Human Resources' : 'IT Support'}</h6>
               <div className="vr h-50"></div>
               <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 small">
                  <li className="breadcrumb-item active text-muted">Request Queue</li>
                </ol>
               </nav>
            </div>

            {/* Center: Search & Filters */}
            <div className="d-flex gap-2 align-items-center">
                <div className="input-group input-group-sm" style={{ width: 220 }}>
                    <span className="input-group-text bg-light border-0 text-muted"><i className="bi bi-search"></i></span>
                    <input className="form-control bg-light border-0 ps-1" placeholder="Search..." 
                        value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleSearch} />
                </div>

                <select className="form-select form-select-sm bg-light border-0" style={{width: 120, cursor: 'pointer'}} 
                    value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                    <option value="">Priority</option>
                    <option value="URGENT">Urgent</option>
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                </select>

                <div className="btn-group btn-group-sm bg-light rounded p-0" role="group">
                    <button className={`btn btn-sm border-0 rounded ${filterAssigned === 'ALL' ? 'bg-white shadow-sm text-primary fw-bold' : 'text-muted'}`} onClick={() => setFilterAssigned('ALL')}>All</button>
                    <button className={`btn btn-sm border-0 rounded ${filterAssigned === 'ME' ? 'bg-white shadow-sm text-primary fw-bold' : 'text-muted'}`} onClick={() => setFilterAssigned('ME')}>Mine</button>
                    <button className={`btn btn-sm border-0 rounded ${filterAssigned === 'UNASSIGNED' ? 'bg-white shadow-sm text-primary fw-bold' : 'text-muted'}`} onClick={() => setFilterAssigned('UNASSIGNED')}>Unassigned</button>
                </div>
            </div>

            {/* Right: View & Create */}
            <div className="d-flex gap-2 align-items-center">
                <div className="btn-group btn-group-sm bg-light rounded p-0" role="group">
                    <button className={`btn btn-sm border-0 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm text-dark' : 'text-muted'}`} onClick={() => setViewMode('kanban')} title="Kanban"><i className="bi bi-kanban"></i></button>
                    <button className={`btn btn-sm border-0 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-dark' : 'text-muted'}`} onClick={() => setViewMode('list')} title="List"><i className="bi bi-list-ul"></i></button>
                </div>
                <div className="vr h-50 mx-1"></div>
                <button className="btn btn-sm btn-primary fw-bold shadow-sm" onClick={() => navigate('/requests/new')} style={{backgroundColor: '#008784', borderColor: '#008784'}}>
                    <i className="bi bi-plus-lg me-1"></i> Create New
                </button>
            </div>
        </div>
      </div>

      {/* 2. CONTENT AREA - Full Width & Height */}
      <div className="flex-grow-1 p-0 overflow-hidden">
        
        {loading && items.length === 0 && (
            <div className="d-flex align-items-center justify-content-center h-100">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        )}

        {/* --- KANBAN VIEW --- */}
        {!loading && viewMode === 'kanban' && (
           <div className="h-100 d-flex overflow-x-auto bg-white px-3 py-3"> 
             {kanbanColumns.map(col => {
                const colItems = filteredItems.filter(i => i.status === col.id);
                return (
                   <div key={col.id} className="d-flex flex-column h-100 me-3" style={{minWidth: 300, width: 300}}>
                      
                      {/* Column Header */}
                      <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                          <div className="d-flex align-items-center fw-bold text-dark small text-uppercase">
                              <span className={`badge rounded-pill me-2 border`} style={{width: 10, height: 10, padding: 0, backgroundColor: col.id === 'COMPLETED' ? '#198754' : col.id === 'IN_PROGRESS' ? '#0d6efd' : col.id === 'PENDING' ? '#ffc107' : '#6c757d'}}> </span>
                              {col.title}
                          </div>
                          <span className="text-muted small fw-bold">{colItems.length}</span>
                      </div>

                      {/* Column Body (Cards) */}
                      <div className="flex-grow-1 overflow-y-auto custom-scrollbar pb-3 pe-1">
                        {colItems.map(item => (
                           <div key={item._id} className="card mb-2 border shadow-sm cursor-pointer hover-shadow transition-all"
                             onClick={() => navigate(`/requests/${item._id}`)}
                             style={{ borderLeft: item.priority === 'URGENT' ? '3px solid #dc3545' : '1px solid rgba(0,0,0,0.125)' }}
                           >
                             <div className="card-body p-3">
                                 <div className="d-flex justify-content-between align-items-start mb-2">
                                     <div className="fw-bold text-dark text-truncate" style={{maxWidth: '85%', fontSize: '0.9rem'}} title={item.title}>{item.title || '(No Title)'}</div>
                                     {item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED' && (
                                         <i className="bi bi-circle-fill text-danger" style={{fontSize: '0.5rem'}} title="Overdue"></i>
                                     )}
                                 </div>
                                 
                                 <div className="d-flex justify-content-between align-items-end">
                                     <div>
                                         <div className="d-flex align-items-center gap-1 mb-1">
                                             <span className="badge bg-light text-muted border fw-normal" style={{fontSize: '0.65rem'}}>{item.typeKey}</span>
                                             {item.priority !== 'LOW' && <PriorityBadge p={item.priority} />}
                                         </div>
                                         <div className="text-muted small" style={{fontSize: '0.7rem'}}>
                                             {item.requester?.name?.split(' ').pop()} • {formatTimeAgo(item.createdAt)}
                                         </div>
                                     </div>
                                     <AssigneeAvatar user={item.assignedTo} />
                                 </div>
                             </div>
                           </div>
                        ))}
                        {colItems.length === 0 && (
                            <div className="text-center py-5 border rounded bg-light border-dashed">
                                <span className="text-muted small opacity-50">Empty</span>
                            </div>
                        )}
                      </div>
                   </div>
                )
             })}
           </div>
        )}

        {/* --- LIST VIEW --- */}
        {!loading && viewMode === 'list' && (
            <div className="h-100 overflow-y-auto">
                <table className="table table-hover mb-0 align-middle text-nowrap w-100 border-top">
                    <thead className="bg-light sticky-top" style={{top: 0, zIndex: 5}}>
                        <tr>
                            <th className="ps-4 small text-muted text-uppercase fw-bold py-2" style={{width: '40%'}}>Title</th>
                            <th className="small text-muted text-uppercase fw-bold py-2">Status</th>
                            <th className="small text-muted text-uppercase fw-bold py-2">Assignee</th>
                            <th className="small text-muted text-uppercase fw-bold py-2 text-end pe-4">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredItems.map(r => (
                            <tr key={r._id} style={{cursor: 'pointer'}} onClick={() => navigate(`/requests/${r._id}`)}>
                                <td className="ps-4 py-2">
                                    <div className="d-flex align-items-center">
                                        <div className={`rounded-circle me-2`} style={{width: 8, height: 8, backgroundColor: r.priority === 'URGENT' ? '#dc3545' : r.priority === 'HIGH' ? '#ffc107' : '#ced4da'}}></div>
                                        <div>
                                            <div className="fw-500 text-dark" style={{fontSize: '0.9rem'}}>{r.title}</div>
                                            <div className="text-muted small" style={{fontSize: '0.75rem'}}>
                                                {r.typeKey} • <span className="text-secondary">{r.requester?.name}</span>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-2">
                                    <span className={`badge rounded-pill fw-normal border ${r.status === 'COMPLETED' ? 'bg-success-subtle text-success border-success-subtle' : r.status === 'IN_PROGRESS' ? 'bg-primary-subtle text-primary border-primary-subtle' : 'bg-light text-dark border-secondary-subtle'}`}>
                                        {r.status}
                                    </span>
                                </td>
                                <td className="py-2">
                                    <div className="d-flex align-items-center gap-2">
                                        <AssigneeAvatar user={r.assignedTo} />
                                        <span className="small text-dark">{r.assignedTo?.name || '-'}</span>
                                    </div>
                                </td>
                                <td className="text-end pe-4 py-2 text-muted small">{formatTimeAgo(r.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
}