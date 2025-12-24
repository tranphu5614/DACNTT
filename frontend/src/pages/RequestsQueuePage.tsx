import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiQueueRequests } from '../api/requests';

type ViewMode = 'list' | 'kanban';

// Helper tính thời gian tương đối (VD: 2 giờ trước)
const formatTimeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return date.toLocaleDateString('vi-VN');
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
  const [filterPriority, setFilterPriority] = useState(''); // Filter bổ sung
  const [filterAssigned, setFilterAssigned] = useState('ALL'); // ALL | ME | UNASSIGNED
  
  const [page, setPage] = useState(1);
  const [limit] = useState(100); // Kanban cần load nhiều

  const kanbanColumns = [
    { id: 'NEW', title: 'Mới', color: 'border-secondary', bg: 'bg-light' },
    { id: 'PENDING', title: 'Chờ duyệt', color: 'border-warning', bg: 'bg-warning-subtle' },
    { id: 'IN_PROGRESS', title: 'Đang xử lý', color: 'border-primary', bg: 'bg-primary-subtle' },
    { id: 'COMPLETED', title: 'Hoàn thành', color: 'border-success', bg: 'bg-success-subtle' }
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

  // Logic lọc Client-side cho Assigned (giúp UX mượt hơn)
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
        'URGENT': { label: 'Khẩn cấp', color: 'danger' },
        'HIGH': { label: 'Cao', color: 'warning text-dark' },
        'MEDIUM': { label: 'TB', color: 'info text-dark' },
        'LOW': { label: 'Thấp', color: 'secondary' }
    };
    const conf = map[p] || map['LOW'];
    return <span className={`badge bg-${conf.color} border border-${conf.color} ms-1`} style={{fontSize: '0.65rem'}}>{conf.label}</span>;
  };

  const AssigneeAvatar = ({ user }: { user?: any }) => {
      if (!user) return (
        <div className="rounded-circle bg-white text-muted border d-flex align-items-center justify-content-center" 
             style={{width: 28, height: 28, fontSize: '0.7rem'}} title="Chưa phân công">
            <i className="bi bi-person-plus"></i>
        </div>
      );
      return (
        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center border border-white shadow-sm" 
             style={{width: 28, height: 28, fontSize: '0.7rem'}} title={`Xử lý bởi: ${user.name}`}>
            {user.name?.[0]?.toUpperCase()}
        </div>
      );
  };

  return (
    <div className="h-100 d-flex flex-column bg-light">
      
      {/* 1. CONTROL PANEL (Filter Bar) */}
      <div className="bg-white border-bottom px-3 py-2 shadow-sm flex-shrink-0">
        <div className="d-flex justify-content-between align-items-center mb-2">
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 small">
                <li className="breadcrumb-item text-uppercase text-muted">Hàng chờ</li>
                <li className="breadcrumb-item active fw-bold text-primary" aria-current="page">
                    {category === 'HR' ? 'Nhân sự (HR)' : 'Công nghệ thông tin (IT)'}
                </li>
                </ol>
            </nav>
            <div className="text-muted small">
                Tổng: <strong>{filteredItems.length}</strong> yêu cầu
            </div>
        </div>

        {/* Toolbar */}
        <div className="d-flex flex-wrap gap-2 align-items-center">
            {/* Search */}
            <div className="input-group input-group-sm" style={{ width: 200 }}>
                <span className="input-group-text bg-light border-end-0"><i className="bi bi-search"></i></span>
                <input className="form-control border-start-0 ps-0" placeholder="Tìm kiếm..." 
                    value={q} onChange={e => setQ(e.target.value)} onKeyDown={handleSearch} />
            </div>

            {/* Filters */}
            <select className="form-select form-select-sm" style={{width: 130}} 
                value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                <option value="">-- Mức độ --</option>
                <option value="URGENT">Khẩn cấp</option>
                <option value="HIGH">Cao</option>
                <option value="MEDIUM">Trung bình</option>
            </select>

            <div className="btn-group btn-group-sm">
                <button className={`btn ${filterAssigned === 'ALL' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilterAssigned('ALL')}>Tất cả</button>
                <button className={`btn ${filterAssigned === 'ME' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilterAssigned('ME')}>Của tôi</button>
                <button className={`btn ${filterAssigned === 'UNASSIGNED' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setFilterAssigned('UNASSIGNED')}>Chưa giao</button>
            </div>

            <div className="vr mx-1"></div>

            {/* View Switcher */}
            <div className="btn-group btn-group-sm ms-auto">
                <button className={`btn ${viewMode === 'kanban' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setViewMode('kanban')} title="Kanban"><i className="bi bi-kanban"></i></button>
                <button className={`btn ${viewMode === 'list' ? 'btn-secondary' : 'btn-outline-secondary'}`} onClick={() => setViewMode('list')} title="List"><i className="bi bi-list-ul"></i></button>
            </div>
            <button className="btn btn-sm btn-primary" onClick={() => navigate('/requests/new')}><i className="bi bi-plus-lg"></i> Tạo mới</button>
        </div>
      </div>

      {/* 2. CONTENT */}
      <div className="flex-grow-1 p-3 overflow-hidden">
        {loading && items.length === 0 && <div className="text-center py-5 text-muted">Đang tải dữ liệu...</div>}

        {/* --- KANBAN VIEW --- */}
        {!loading && viewMode === 'kanban' && (
           <div className="o_kanban_view h-100 d-flex gap-3 overflow-x-auto pb-2">
             {kanbanColumns.map(col => {
                const colItems = filteredItems.filter(i => i.status === col.id);
                return (
                   <div key={col.id} className="o_kanban_column d-flex flex-column rounded bg-light border shadow-sm" style={{minWidth: 320, width: 320, maxHeight: '100%'}}>
                      <div className={`p-2 fw-bold text-dark border-bottom d-flex justify-content-between align-items-center bg-white rounded-top border-top-3 ${col.color}`} style={{borderTopWidth: 3}}>
                          <span className="small text-uppercase fw-bold text-secondary">{col.title}</span>
                          <span className="badge bg-secondary-subtle text-dark rounded-pill border">{colItems.length}</span>
                      </div>

                      <div className="p-2 overflow-y-auto flex-grow-1 custom-scrollbar bg-light">
                        {colItems.map(item => (
                           <div key={item._id} className="card mb-2 border-0 shadow-sm cursor-pointer o_kanban_card"
                              onClick={() => navigate(`/requests/${item._id}`)}
                              style={{ borderLeft: `4px solid ${item.priority === 'URGENT' ? '#dc3545' : item.priority === 'HIGH' ? '#ffc107' : 'transparent'}` }}
                           >
                              <div className="card-body p-2">
                                  <div className="d-flex justify-content-between mb-1">
                                      <div className="fw-bold text-truncate text-primary" style={{maxWidth: '80%'}}>{item.title || '(Không tiêu đề)'}</div>
                                      {/* Icon Deadline nếu gấp */}
                                      {item.dueDate && new Date(item.dueDate) < new Date() && item.status !== 'COMPLETED' && (
                                          <i className="bi bi-exclamation-circle-fill text-danger" title="Quá hạn"></i>
                                      )}
                                  </div>
                                  
                                  <div className="d-flex justify-content-between align-items-end mt-2">
                                     <div>
                                        <div className="text-muted small mb-1 d-flex align-items-center">
                                            <span className="badge bg-light text-secondary border me-1">{item.typeKey}</span>
                                            {item.priority !== 'LOW' && <PriorityBadge p={item.priority} />}
                                        </div>
                                        <div className="text-muted small" style={{fontSize: '0.65rem'}}>
                                            <i className="bi bi-clock me-1"></i> {formatTimeAgo(item.createdAt)}
                                        </div>
                                     </div>
                                     
                                     {/* Avatar Group */}
                                     <div className="d-flex align-items-center">
                                         {/* Người tạo (nhỏ) */}
                                         <div className="me-1 opacity-50" title={`Người tạo: ${item.requester?.name}`}>
                                            <small style={{fontSize: '0.6rem'}}>{item.requester?.name?.split(' ').pop()}</small>
                                         </div>
                                         {/* Người xử lý (lớn) */}
                                         <AssigneeAvatar user={item.assignedTo} />
                                     </div>
                                  </div>
                              </div>
                           </div>
                        ))}
                        {colItems.length === 0 && <div className="text-center text-muted small py-5 opacity-50 fst-italic">Không có yêu cầu</div>}
                      </div>
                   </div>
                )
             })}
           </div>
        )}

        {/* --- LIST VIEW --- */}
        {!loading && viewMode === 'list' && (
            <div className="card shadow-sm border-0 h-100 d-flex flex-column">
                <div className="table-responsive flex-grow-1">
                    <table className="table table-hover mb-0 align-middle text-nowrap">
                        <thead className="bg-light sticky-top" style={{top: 0, zIndex: 5}}>
                            <tr>
                                <th className="border-0 text-muted small text-uppercase ps-3">Tiêu đề</th>
                                <th className="border-0 text-muted small text-uppercase">Loại</th>
                                <th className="border-0 text-muted small text-uppercase">Trạng thái</th>
                                <th className="border-0 text-muted small text-uppercase">Người xử lý</th>
                                <th className="border-0 text-muted small text-uppercase">Cập nhật cuối</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredItems.map(r => (
                                <tr key={r._id} style={{cursor: 'pointer'}} onClick={() => navigate(`/requests/${r._id}`)}>
                                    <td className="ps-3">
                                        <div className="fw-500 text-primary">{r.title}</div>
                                        <div className="small text-muted">
                                            {r.priority !== 'LOW' && <span className={`text-${r.priority === 'URGENT' ? 'danger' : 'warning'} fw-bold me-1`}>[{r.priority}]</span>}
                                            Tạo bởi: {r.requester?.name}
                                        </div>
                                    </td>
                                    <td><span className="badge bg-light text-dark border">{r.typeKey}</span></td>
                                    <td>
                                        <span className={`badge bg-light text-dark border ${r.status === 'COMPLETED' ? 'text-success border-success' : ''}`}>
                                            {r.status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="d-flex align-items-center">
                                            <AssigneeAvatar user={r.assignedTo} />
                                            <span className="ms-2 small">{r.assignedTo?.name || <span className="text-muted fst-italic">Chưa giao</span>}</span>
                                        </div>
                                    </td>
                                    <td className="text-muted small">{formatTimeAgo(r.createdAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}