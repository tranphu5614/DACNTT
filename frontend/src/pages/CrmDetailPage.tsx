import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getCrmDetail, assignDeal, updateDealStatus, addCrmComment, CrmDetail } from '../api/crm';
import { apiGetStaffsByDept, UserItem } from '../api/users';

// --- HELPER COMPONENTS ---

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', {year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute:'2-digit'}) : '-';

const getAvatarColor = (name: string) => {
  const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark', 'bg-info text-dark', 'bg-purple'];
  let hash = 0; for(let i=0; i<name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

// Pipeline Status Bar (Interactive)
// UPDATE: Thêm prop onStatusChange để xử lý click
const OdooStatusBar = ({ currentStatus, onStatusChange }: { currentStatus: string, onStatusChange: (status: string) => void }) => {
    const stages = [
        { key: 'NEW', label: 'New' },
        { key: 'ASSIGNED', label: 'Assigned' },
        { key: 'IN_PROGRESS', label: 'In Progress' },
        { key: 'WIN', label: 'Won' },
        { key: 'LOSE', label: 'Lost' }
    ];

    return (
        <div className="d-flex bg-white border rounded overflow-hidden shadow-sm">
            {stages.map((stage) => {
                const isActive = stage.key === currentStatus;
                
                let bgClass = "bg-light text-muted border-end hover-bg-gray"; // Thêm class hover nếu cần
                
                if (isActive) {
                    if (stage.key === 'WIN') {
                        bgClass = "bg-success text-white border-success";
                    } else if (stage.key === 'LOSE') {
                        bgClass = "bg-danger text-white border-danger";
                    } else {
                        bgClass = "bg-primary text-white border-primary";
                    }
                }

                return (
                    <button 
                        key={stage.key} 
                        className={`d-flex align-items-center justify-content-center py-2 px-3 small fw-bold user-select-none border-0 ${bgClass}`} 
                        // UPDATE: Thêm onClick và đổi cursor thành pointer
                        onClick={() => onStatusChange(stage.key)}
                        disabled={isActive} // Disable nút đang active để tránh click lại
                        style={{ cursor: isActive ? 'default' : 'pointer', minWidth: '100px', borderRight: isActive ? 'none' : '1px solid #dee2e6' }}
                        title={isActive ? "Current Status" : `Move to ${stage.label}`}
                    >
                        {stage.label}
                    </button>
                );
            })}
        </div>
    );
};

// --- MAIN PAGE ---

export default function CrmDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, hasRole, user } = useAuth();
  const [data, setData] = useState<CrmDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<UserItem[]>([]);
  const [comment, setComment] = useState('');
  const timelineRef = useRef<HTMLDivElement>(null); 
  
  const isManager = hasRole('ADMIN') || hasRole('SALE_MANAGER');

  const loadData = async () => {
    if (!token || !id) return;
    try {
      const res = await getCrmDetail(token, id);
      setData(res);
      if (isManager) apiGetStaffsByDept(token, 'SALES').then(setStaffList).catch(() => {});
    } catch (err) { navigate('/crm'); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [token, id]);

  useEffect(() => {
    if (timelineRef.current) {
        timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [data?.comments, data?.history]);

  const chatterMessages = useMemo(() => {
    if (!data) return [];
    const cmts = (data.comments || []).map(c => ({ id: c._id, type: 'comment', author: c.author?.name, avatar: c.author?.name?.[0], date: new Date(c.createdAt), content: c.content }));
    const hists = (data.history || []).map((h: any, idx: number) => ({ id: `h-${idx}`, type: 'log', author: h.user?.name || 'System', avatar: h.user?.name?.[0], date: new Date(h.timestamp), content: `${h.action}${h.note ? ': ' + h.note : ''}` }));
    return [...cmts, ...hists].sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [data]);

  const handleAction = async (fn: () => Promise<any>) => { try { await fn(); loadData(); } catch (e) { alert('An error occurred'); } };
  
  const handleSendComment = () => { if(comment.trim()) handleAction(() => addCrmComment(token!, id!, comment)).then(() => setComment('')); };

  // UPDATE: Hàm xử lý khi click vào thanh trạng thái
  const handleStatusBarChange = (newStatus: string) => {
    if (!token || !id || !data) return;
    
    // Nếu click vào trạng thái hiện tại thì bỏ qua
    if (newStatus === data.status) return;

    // Xác nhận trước khi thay đổi (Business Logic an toàn)
    if (window.confirm(`Are you sure you want to move status to ${newStatus}?`)) {
        handleAction(() => updateDealStatus(token, id, newStatus));
    }
  };

  if (loading || !data) return <div className="p-5 text-center"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* 1. STICKY HEADER */}
      <div className="bg-white border-bottom py-2 px-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center sticky-top shadow-sm" style={{ zIndex: 100 }}>
        <div className="d-flex align-items-center gap-3 mb-2 mb-md-0">
             <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate('/crm')}><i className="bi bi-arrow-left"></i></button>
             <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0 small">
                    <li className="breadcrumb-item"><Link to="/crm" className="text-decoration-none">CRM</Link></li>
                    <li className="breadcrumb-item active text-dark fw-bold" aria-current="page">{data.customer?.fullName}</li>
                </ol>
             </nav>
        </div>
        <div className="d-flex align-items-center gap-2">
            {/* Vẫn giữ nút Quick Action nếu cần, hoặc có thể ẩn đi vì đã có Status Bar tương tác */}
            {['NEW', 'ASSIGNED', 'IN_PROGRESS'].includes(data.status) && (
                <>
                    <button className="btn btn-sm btn-outline-success" onClick={() => handleStatusBarChange('WIN')}>
                        <i className="bi bi-check-lg me-1"></i>Mark Won
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleStatusBarChange('LOSE')}>
                        <i className="bi bi-x-lg me-1"></i>Mark Lost
                    </button>
                </>
            )}
            
            {/* UPDATE: Truyền hàm handleStatusBarChange vào đây */}
            <div className="d-none d-lg-block ms-2">
                <OdooStatusBar currentStatus={data.status} onStatusChange={handleStatusBarChange} />
            </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT - Layout 7/5 */}
      <div className="container-fluid py-4 flex-grow-1">
        <div className="row g-4 h-100">
            
            {/* LEFT COLUMN - 7 Parts */}
            <div className="col-lg-7 d-flex flex-column">
                <div className="card border-0 shadow-sm rounded-3 flex-grow-1">
                    <div className="card-body p-4">
                        {/* Header Title */}
                        <div className="d-flex justify-content-between align-items-start mb-4 border-bottom pb-3">
                            <div>
                                <h2 className="fw-bold mb-1">{data.customer?.fullName}</h2>
                                <div className="text-muted">{data.customer?.companyName || 'Individual'}</div>
                            </div>
                            <div className="text-end text-muted small">
                                <div>Created on: {new Date(data.createdAt).toLocaleDateString('en-US')}</div>
                                <div className={`badge bg-${data.status === 'WIN' ? 'success' : data.status === 'LOSE' ? 'danger' : 'primary'} mt-1`}>
                                    {data.status}
                                </div>
                            </div>
                        </div>

                        <div className="row g-4">
                            {/* Panel: Contact Info */}
                            <div className="col-12">
                                <div className="bg-light rounded-3 p-3 border">
                                    <h6 className="fw-bold text-primary mb-3"><i className="bi bi-person-lines-fill me-2"></i>Contact Information</h6>
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="small text-muted d-block">Email</label>
                                            <span className="fw-medium">{data.customer?.email}</span>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="small text-muted d-block">Phone Number</label>
                                            <span className="font-monospace fw-medium">{data.customer?.phoneNumber}</span>
                                        </div>
                                        <div className="col-md-12">
                                            <label className="small text-muted d-block mb-1">Salesperson</label>
                                            {isManager ? (
                                                <select className="form-select form-select-sm w-auto" value={data.assignedTo?._id || ''} onChange={(e) => handleAction(() => assignDeal(token!, id!, e.target.value))}>
                                                    <option value="">-- Unassigned --</option>
                                                    {staffList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                                </select>
                                            ) : (
                                                <div className="d-flex align-items-center">
                                                    {data.assignedTo ? (
                                                        <><div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-2 small ${getAvatarColor(data.assignedTo.name)}`} style={{width: 24, height: 24}}>{data.assignedTo.name.charAt(0)}</div>{data.assignedTo.name}</>
                                                    ) : (
                                                        <button className="btn btn-sm btn-outline-primary" onClick={() => handleAction(() => assignDeal(token!, id!, user?._id || ''))}><i className="bi bi-hand-index-thumb me-1"></i>Assign to Me</button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Panel: Requirements */}
                            <div className="col-12">
                                 <h6 className="fw-bold text-dark mb-2"><i className="bi bi-file-text me-2"></i>Requirements / Description</h6>
                                 <div className="bg-white p-3 rounded border" style={{ whiteSpace: 'pre-line', minHeight: '150px' }}>{data.requirement}</div>
                            </div>
                            
                            {data.note && (
                                <div className="col-12">
                                    <h6 className="fw-bold text-muted small mb-1"><i className="bi bi-journal-bookmark me-2"></i>Internal Notes</h6>
                                    <div className="text-muted fst-italic small ps-4">{data.note}</div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN - 5 Parts */}
            <div className="col-lg-5 d-flex flex-column" style={{ maxHeight: 'calc(100vh - 130px)' }}>
                <div className="card border-0 shadow-sm rounded-3 h-100 d-flex flex-column">
                    <div className="card-header bg-white fw-bold py-3">
                        <i className="bi bi-chat-left-text me-2"></i>Chatter & History
                    </div>
                    
                    {/* Timeline Scrollable Area */}
                    <div className="card-body p-0 flex-grow-1 overflow-y-auto bg-light custom-scrollbar" ref={timelineRef}>
                        <div className="p-3">
                            {chatterMessages.length === 0 && <div className="text-center text-muted small py-5">No activities yet</div>}
                            {chatterMessages.map((msg) => (
                                <div key={msg.id} className="mb-3 d-flex">
                                    <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-3 flex-shrink-0 small ${getAvatarColor(msg.author || '?')}`} style={{width: 32, height: 32}}>{msg.avatar}</div>
                                    <div className="flex-grow-1">
                                        <div className="d-flex align-items-center mb-1">
                                            <span className="fw-bold small me-2">{msg.author}</span>
                                            <small className="text-muted" style={{fontSize: '0.7rem'}}>{formatDate(msg.date.toISOString())}</small>
                                        </div>
                                        <div className={`p-3 rounded-3 ${msg.type === 'log' ? 'bg-secondary bg-opacity-10 text-secondary fst-italic small' : 'bg-white border shadow-sm'}`}>
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Input Area */}
                    <div className="card-footer bg-white border-top p-3">
                        <div className="input-group">
                            <textarea className="form-control" rows={2} placeholder="Write a message..." value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => {if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); handleSendComment(); }}} style={{resize: 'none'}}></textarea>
                            <button className="btn btn-primary px-4" disabled={!comment.trim()} onClick={handleSendComment}><i className="bi bi-send-fill"></i></button>
                        </div>
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}