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
      // API hiện tại chưa hỗ trợ filter status ở endpoint /mine, nên ta filter client-side tạm thời
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
    return <span className={`badge bg-${conf.color} border border-${conf.color} ms-1`} style={{fontSize: '0.65rem'}}>{conf.label}</span>;
  };

  const AssigneeAvatar = ({ user }: { user?: any }) => {
      if (!user) return (
        <div className="rounded-circle bg-white text-muted border d-flex align-items-center justify-content-center" 
             style={{width: 24, height: 24, fontSize: '0.6rem'}} title="Chưa có người xử lý">
            <i className="bi bi-dash"></i>
        </div>
      );
      return (
        <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center border border-white shadow-sm" 
             style={{width: 24, height: 24, fontSize: '0.6rem'}} title={`Đang xử lý bởi: ${user.name}`}>
            {user.name?.[0]?.toUpperCase()}
        </div>
      );
  };

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* 1. CONTROL PANEL */}
      <div className="o_control_panel bg-white border-bottom px-3 py-2 d-flex justify-content-between align-items-center shadow-sm flex-shrink-0" style={{zIndex: 99}}>
        <div>
           <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item text-muted">Yêu cầu</li>
              <li className="breadcrumb-item active fw-bold text-primary" aria-current="page">Của tôi</li>
            </ol>
          </nav>
        </div>

        <div className="d-flex gap-2 align-items-center">
            {/* Quick Filter Status */}
            <select 
                className="form-select form-select-sm" 
                style={{width: 140}} 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
            >
                <option value="">-- Tất cả --</option>
                <option value="NEW">Mới</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="COMPLETED">Hoàn thành</option>
            </select>

            <button className="btn btn-sm btn-light border" onClick={load} title="Tải lại">
               <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
            </button>

            <div className="btn-group btn-group-sm">
                <button 
                    className={`btn ${viewMode === 'kanban' ? 'btn-secondary' : 'btn-outline-secondary'}`} 
                    onClick={() => setViewMode('kanban')}
                >
                    <i className="bi bi-kanban"></i>
                </button>
                <button 
                    className={`btn ${viewMode === 'list' ? 'btn-secondary' : 'btn-outline-secondary'}`} 
                    onClick={() => setViewMode('list')}
                >
                    <i className="bi bi-list-ul"></i>
                </button>
            </div>
            
            <Link to="/requests/new" className="btn btn-sm btn-primary">
                <i className="bi bi-plus-lg me-1"></i> Tạo mới
            </Link>
        </div>
      </div>

      {/* 2. CONTENT */}
      <div className="flex-grow-1 p-3 overflow-hidden">
        
        {/* --- KANBAN VIEW --- */}
        {viewMode === 'kanban' && (
           <div className="o_kanban_view h-100 d-flex gap-3 overflow-x-auto pb-2">
             {kanbanColumns.map(col => {
                const colItems = filteredRows.filter(r => r.status === col.id);
                if (col.id === 'CANCELLED' && colItems.length === 0) return null;

                return (
                   <div key={col.id} className="o_kanban_column d-flex flex-column rounded bg-light border shadow-sm" style={{minWidth: 300, width: 300, maxHeight: '100%'}}>
                      <div className={`p-2 fw-bold text-dark border-bottom d-flex justify-content-between align-items-center bg-white rounded-top border-top-3 ${col.color}`} style={{borderTopWidth: 3}}>
                          <span className="small text-uppercase text-secondary">{col.title}</span>
                          <span className="badge bg-secondary-subtle text-dark border rounded-pill">{colItems.length}</span>
                      </div>

                      <div className="p-2 overflow-y-auto flex-grow-1 custom-scrollbar bg-light">
                        {colItems.map(item => (
                           <div 
                              key={item._id} 
                              className={`card mb-2 border-0 shadow-sm cursor-pointer o_kanban_card`}
                              onClick={() => navigate(`/requests/${item._id}`)}
                              style={{ borderLeft: `4px solid ${item.priority === 'URGENT' ? '#dc3545' : item.priority === 'HIGH' ? '#ffc107' : 'transparent'}` }}
                           >
                              <div className="card-body p-2">
                                  <div className="fw-bold text-truncate mb-1 text-primary">{item.title || '(Không tiêu đề)'}</div>
                                  
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
                                     {/* Avatar Assignee */}
                                     <div className="d-flex align-items-center">
                                         <AssigneeAvatar user={item.assignedTo} />
                                     </div>
                                  </div>
                              </div>
                           </div>
                        ))}
                         {colItems.length === 0 && <div className="text-center text-muted small py-5 opacity-50 fst-italic">Trống</div>}
                      </div>
                   </div>
                )
             })}
           </div>
        )}

        {/* --- LIST VIEW --- */}
        {viewMode === 'list' && (
            <div className="card shadow-sm border-0 h-100 d-flex flex-column">
                <div className="table-responsive flex-grow-1">
                    <table className="table table-hover mb-0 align-middle text-nowrap">
                        <thead className="bg-light sticky-top" style={{top: 0, zIndex: 5}}>
                            <tr>
                                <th className="border-0 text-muted small text-uppercase ps-3">Tiêu đề</th>
                                <th className="border-0 text-muted small text-uppercase">Loại</th>
                                <th className="border-0 text-muted small text-uppercase">Trạng thái</th>
                                <th className="border-0 text-muted small text-uppercase">Người xử lý</th>
                                <th className="border-0 text-muted small text-uppercase text-end">Cập nhật</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map(r => (
                                <tr key={r._id} style={{cursor: 'pointer'}} onClick={() => navigate(`/requests/${r._id}`)}>
                                    <td className="ps-3">
                                        <div className="fw-500 text-primary">{r.title || '(Không tiêu đề)'}</div>
                                        <div className="small text-muted">
                                            {r.priority !== 'LOW' && <span className={`text-${r.priority === 'URGENT' ? 'danger' : 'warning'} fw-bold me-1`}>[{r.priority}]</span>}
                                            <span className="fst-italic text-secondary" style={{fontSize: '0.75rem'}}>#{r._id.slice(-6)}</span>
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
                                            <span className="ms-2 small text-muted">
                                                {r.assignedTo?.name || <span className="fst-italic opacity-75">Chưa giao</span>}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="text-end text-muted small">{formatTimeAgo(r.updatedAt)}</td>
                                </tr>
                            ))}
                            {filteredRows.length === 0 && !loading && (
                                <tr><td colSpan={5} className="text-center py-5 text-muted">Không tìm thấy yêu cầu nào</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 
                 <div className="card-footer bg-white py-2 border-top d-flex justify-content-between align-items-center gap-2">
                    <div className="text-muted small">
                        Hiển thị <strong>{filteredRows.length}</strong> / <strong>{total}</strong> yêu cầu
                    </div>
                    <div>
                        <button className="btn btn-sm btn-outline-secondary me-1" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                            <i className="bi bi-chevron-left"></i> Trước
                        </button>
                        <button 
                            className="btn btn-sm btn-outline-secondary" 
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * limit >= total} 
                        >
                            Sau <i className="bi bi-chevron-right"></i>
                        </button>
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}