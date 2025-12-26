import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiMyRequests, MyRequestItem } from '../api/requests';
import { useAuth } from '../context/AuthContext';

type ViewMode = 'list' | 'kanban';

// Helper tính thời gian tương đối
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

export default function MyRequestsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  // Data State
  const [rows, setRows] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(false);
  
  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('kanban'); 
  const [page, setPage] = useState(1);
  const [limit] = useState(50); 
  const [total, setTotal] = useState(0); 
  const [filterStatus, setFilterStatus] = useState<string>(''); // Bộ lọc nhanh

  // Kanban Columns
  const kanbanColumns = [
    { id: 'NEW', title: 'Mới', color: 'border-secondary', bg: 'bg-light' },
    { id: 'PENDING', title: 'Chờ duyệt', color: 'border-warning', bg: 'bg-warning-subtle' },
    { id: 'IN_PROGRESS', title: 'Đang xử lý', color: 'border-primary', bg: 'bg-primary-subtle' },
    { id: 'COMPLETED', title: 'Hoàn thành', color: 'border-success', bg: 'bg-success-subtle' },
    { id: 'CANCELLED', title: 'Đã hủy', color: 'border-danger', bg: 'bg-danger-subtle' }
  ];

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await apiMyRequests(token, { page, limit });
      setRows(res.items);
      setTotal(res.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token, page, limit]);

  // Logic lọc Client-side
  const filteredRows = rows.filter(r => !filterStatus || r.status === filterStatus);

  // --- RENDER HELPERS ---
  const PriorityBadge = ({ p }: { p?: string }) => {
    if (!p) return null;
    const map: any = { 
        'URGENT': { label: 'Khẩn cấp', color: 'danger' },
        'HIGH': { label: 'Cao', color: 'warning text-dark' },
        'MEDIUM': { label: 'TB', color: 'info text-dark' },
        'LOW': { label: 'Thấp', color: 'secondary' }
    };
    const conf = map[p] || map['LOW'];
    return <span className={`badge bg-${conf.color}-subtle text-${conf.color} border border-${conf.color}-subtle ms-1 fw-normal`} style={{fontSize: '0.65rem'}}>{conf.label}</span>;
  };

  const AssigneeAvatar = ({ user }: { user?: any }) => {
      if (!user) return (
        <div className="rounded-circle bg-light text-muted border d-flex align-items-center justify-content-center" 
             style={{width: 24, height: 24, fontSize: '0.65rem'}} title="Chưa có người xử lý">
            <i className="bi bi-dash"></i>
        </div>
      );
      return (
        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center border border-white shadow-sm" 
             style={{width: 24, height: 24, fontSize: '0.65rem'}} title={`Đang xử lý bởi: ${user.name}`}>
            {user.name?.[0]?.toUpperCase()}
        </div>
      );
  };

  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* 1. CONTROL PANEL - Dính liền, Sticky */}
      <div className="border-bottom px-4 py-2 d-flex justify-content-between align-items-center bg-white sticky-top flex-shrink-0" style={{zIndex: 100, height: 56}}>
        
        {/* Left: Breadcrumb */}
        <div className="d-flex align-items-center gap-3">
           <h6 className="fw-bold text-dark m-0 text-uppercase">Yêu cầu của tôi</h6>
           <div className="vr h-50"></div>
           <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item active text-muted">Danh sách</li>
            </ol>
           </nav>
        </div>

        {/* Right: Tools */}
        <div className="d-flex gap-2 align-items-center">
            
            {/* Quick Filter Status */}
            <select 
                className="form-select form-select-sm bg-light border-0 fw-500" 
                style={{width: 140, cursor: 'pointer'}} 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="">Tất cả trạng thái</option>
                <option value="NEW">Mới tạo</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="COMPLETED">Hoàn thành</option>
            </select>

            <button className="btn btn-sm btn-light border-0 rounded-circle" onClick={load} title="Tải lại" style={{width: 32, height: 32}}>
               <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            </button>

            <div className="vr h-50 mx-1"></div>

            <div className="btn-group btn-group-sm bg-light rounded p-0" role="group">
                <button 
                    className={`btn btn-sm border-0 rounded ${viewMode === 'kanban' ? 'bg-white shadow-sm text-dark' : 'text-muted'}`} 
                    onClick={() => setViewMode('kanban')}
                >
                    <i className="bi bi-kanban"></i>
                </button>
                <button 
                    className={`btn btn-sm border-0 rounded ${viewMode === 'list' ? 'bg-white shadow-sm text-dark' : 'text-muted'}`} 
                    onClick={() => setViewMode('list')}
                >
                    <i className="bi bi-list-ul"></i>
                </button>
            </div>
            
            <Link to="/requests/new" className="btn btn-sm btn-primary fw-bold ms-2 shadow-sm" style={{backgroundColor: '#008784', borderColor: '#008784'}}>
                <i className="bi bi-plus-lg me-1"></i> Tạo mới
            </Link>
        </div>
      </div>

      {/* 2. CONTENT AREA - Full Width/Height */}
      <div className="flex-grow-1 p-0 overflow-hidden">
        
        {loading && rows.length === 0 && (
            <div className="d-flex align-items-center justify-content-center h-100">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
        )}

        {/* --- KANBAN VIEW --- */}
        {!loading && viewMode === 'kanban' && (
           <div className="h-100 d-flex gap-3 overflow-x-auto px-3 py-3 bg-white">
             {kanbanColumns.map(col => {
                const colItems = filteredRows.filter(r => r.status === col.id);
                // Ẩn cột Huỷ nếu ko có item nào để đỡ rối
                if (col.id === 'CANCELLED' && colItems.length === 0) return null;

                return (
                   <div key={col.id} className="d-flex flex-column h-100 flex-shrink-0" style={{width: 300}}>
                      
                      {/* Column Header */}
                      <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                          <div className="d-flex align-items-center fw-bold text-dark small text-uppercase">
                              <span className={`badge rounded-pill me-2 border`} 
                                    style={{
                                        width: 10, height: 10, padding: 0, 
                                        backgroundColor: col.id === 'COMPLETED' ? '#198754' : col.id === 'IN_PROGRESS' ? '#0d6efd' : col.id === 'PENDING' ? '#ffc107' : '#6c757d'
                                    }}> 
                              </span>
                              {col.title}
                          </div>
                          <span className="text-muted small fw-bold">{colItems.length}</span>
                      </div>

                      {/* Column Body */}
                      <div className="flex-grow-1 overflow-y-auto custom-scrollbar pb-3 pe-1">
                        {colItems.map(item => (
                           <div 
                              key={item._id} 
                              className="card mb-2 border shadow-sm cursor-pointer hover-shadow transition-all"
                              onClick={() => navigate(`/requests/${item._id}`)}
                              style={{ borderLeft: item.priority === 'URGENT' ? '3px solid #dc3545' : '1px solid rgba(0,0,0,0.125)' }}
                           >
                             <div className="card-body p-3">
                                 <div className="fw-bold text-dark mb-1 text-truncate" style={{fontSize: '0.9rem'}}>{item.title || '(Không tiêu đề)'}</div>
                                 
                                 <div className="d-flex justify-content-between align-items-end mt-2">
                                     <div>
                                         <div className="d-flex align-items-center gap-1 mb-1">
                                             <span className="badge bg-light text-secondary border fw-normal" style={{fontSize: '0.65rem'}}>{item.typeKey}</span>
                                             {item.priority !== 'LOW' && <PriorityBadge p={item.priority} />}
                                         </div>
                                         <div className="text-muted small" style={{fontSize: '0.7rem'}}>
                                             <i className="bi bi-clock me-1"></i> {formatTimeAgo(item.createdAt)}
                                         </div>
                                     </div>
                                     <AssigneeAvatar user={item.assignedTo} />
                                 </div>
                             </div>
                           </div>
                        ))}
                        {colItems.length === 0 && (
                            <div className="text-center py-5 border rounded bg-light border-dashed">
                                <span className="text-muted small opacity-50">Trống</span>
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
                            <th className="ps-4 small text-muted text-uppercase fw-bold py-2" style={{width: '40%'}}>Tiêu đề</th>
                            <th className="small text-muted text-uppercase fw-bold py-2">Trạng thái</th>
                            <th className="small text-muted text-uppercase fw-bold py-2">Người xử lý</th>
                            <th className="small text-muted text-uppercase fw-bold py-2 text-end pe-4">Cập nhật</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRows.map(r => (
                            <tr key={r._id} style={{cursor: 'pointer'}} onClick={() => navigate(`/requests/${r._id}`)}>
                                <td className="ps-4 py-2">
                                    <div className="d-flex align-items-center">
                                        <div className={`rounded-circle me-2`} style={{width: 8, height: 8, backgroundColor: r.priority === 'URGENT' ? '#dc3545' : r.priority === 'HIGH' ? '#ffc107' : '#ced4da'}}></div>
                                        <div>
                                            <div className="fw-500 text-dark" style={{fontSize: '0.9rem'}}>{r.title || '(Không tiêu đề)'}</div>
                                            <div className="text-muted small" style={{fontSize: '0.75rem'}}>
                                                {r.typeKey} <span className="fst-italic text-secondary ms-1">#{r._id.slice(-6)}</span>
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
                                <td className="text-end pe-4 py-2 text-muted small">{formatTimeAgo(r.updatedAt)}</td>
                            </tr>
                        ))}
                        {filteredRows.length === 0 && (
                            <tr><td colSpan={4} className="text-center py-5 text-muted small">Không tìm thấy yêu cầu nào</td></tr>
                        )}
                    </tbody>
                </table>
                
                {/* Footer Pagination (List View Only) */}
                <div className="border-top px-4 py-2 bg-light d-flex justify-content-between align-items-center sticky-bottom" style={{bottom: 0}}>
                    <div className="text-muted small">
                        Tổng số: <strong>{total}</strong> yêu cầu
                    </div>
                    <div>
                        <button className="btn btn-sm btn-white border me-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <i className="bi bi-chevron-left"></i>
                        </button>
                        <button className="btn btn-sm btn-white border" disabled={rows.length < limit} onClick={() => setPage(p => p + 1)}>
                            <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}