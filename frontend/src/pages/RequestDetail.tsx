import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  apiGetRequestDetail,
  apiApproveRequest,
  apiRejectRequest,
  apiAssignRequest,
  apiAddComment,
  apiUpdateStatus,
  MyRequestItem
} from '../api/requests';
import { apiGetStaffsByDept, UserItem } from '../api/users';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, hasRole, user } = useAuth();

  // --- STATE ---
  const [data, setData] = useState<MyRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<UserItem[]>([]);
  
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'desc' | 'custom' | 'approval'>('desc');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // --- LOAD DATA ---
  const loadData = async () => {
    try {
      const res = await apiGetRequestDetail(token!, id!);
      setData(res);
      if (res.category && !['HR', 'ADMIN'].includes(res.category)) {
          apiGetStaffsByDept(token!, res.category)
            .then(setStaffList)
            .catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Không tải được dữ liệu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  // --- LOGIC CHATTER ---
  const chatterMessages = useMemo(() => {
    if (!data) return [];
    
    const cmts = (data.comments || []).map(c => ({
      id: c._id,
      type: 'comment',
      author: c.author?.name || 'Unknown',
      avatar: c.author?.name?.[0],
      date: new Date(c.createdAt),
      content: c.content,
      isInternal: c.isInternal,
      style: c.isInternal ? 'bg-warning-subtle' : 'bg-white'
    }));

    const hists = (data.history || []).map((h: any, idx: number) => ({
      id: `h-${idx}`,
      type: 'log',
      author: h.user?.name || 'System',
      avatar: h.user?.name?.[0] || 'S',
      date: new Date(h.timestamp),
      content: `${h.action}${h.note ? ': ' + h.note : ''}`,
      isInternal: true,
      style: 'bg-light text-muted fst-italic'
    }));

    return [...cmts, ...hists].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [data]);

  // --- ACTIONS HANDLER ---
  const handleAction = async (actionFn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await actionFn();
      await loadData(); 
    } catch (e: any) {
      alert(e.message || 'Lỗi thực hiện hành động');
    }
  };

  if (loading || !data) return (
    <div className="d-flex align-items-center justify-content-center h-100 bg-white">
        <div className="spinner-border text-primary"></div>
    </div>
  );

  // --- PERMISSIONS & WORKFLOW ---
  const isManager = hasRole('ADMIN') || hasRole('MANAGER') || hasRole('IT_MANAGER') || hasRole('HR_MANAGER');
  const isSimpleWorkflow = ['HR', 'ADMIN'].includes(data.category) || !!data.bookingRoomKey;
  const canChangeState = (isManager || user?._id === data.assignedTo?._id) && !isSimpleWorkflow;

  let pipelineSteps = ['NEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];
  let currentStep = data.status;

  if (isSimpleWorkflow) {
      pipelineSteps = ['DRAFT', 'WAITING_APPROVAL', 'APPROVED'];
      if (data.approvalStatus === 'APPROVED') currentStep = 'APPROVED';
      else if (data.approvalStatus === 'REJECTED') currentStep = 'REJECTED'; 
      else if (data.approvalStatus === 'PENDING') currentStep = 'WAITING_APPROVAL';
      else currentStep = 'DRAFT';
  }

  // ================= RENDER =================
  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* 1. HEADER (CONTROL PANEL) */}
      <div className="border-bottom px-3 py-2 d-flex justify-content-between align-items-center bg-white sticky-top" style={{zIndex: 100, height: 50}}> {/* Giảm height header */}
        
        <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-sm btn-light border rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: 30, height: 30}} onClick={() => navigate(-1)} title="Quay lại">
                <i className="bi bi-arrow-left"></i>
            </button>
            
            {/* Actions */}
            {isManager && data.approvalStatus === 'PENDING' && (
                <>
                    <button className="btn btn-sm btn-primary fw-bold px-3" onClick={() => handleAction(() => apiApproveRequest(token!, id!, 'Approved'), 'Duyệt yêu cầu?')}>
                        <i className="bi bi-check-lg me-1"></i> DUYỆT
                    </button>
                    <button className="btn btn-sm btn-outline-danger px-3" onClick={() => {
                        const r = prompt('Lý do từ chối?');
                        if(r) handleAction(() => apiRejectRequest(token!, id!, r));
                    }}>
                        TỪ CHỐI
                    </button>
                </>
            )}

            {canChangeState && (
                <>
                    {data.status === 'NEW' && <button className="btn btn-sm btn-primary" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'IN_PROGRESS'))}>Bắt đầu</button>}
                    {data.status === 'IN_PROGRESS' && (
                        <>
                             <button className="btn btn-sm btn-success text-white" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'COMPLETED'), 'Hoàn thành?')}>Hoàn thành</button>
                             <button className="btn btn-sm btn-light border" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'PENDING'))}>Tạm hoãn</button>
                        </>
                    )}
                    {data.status === 'PENDING' && <button className="btn btn-sm btn-primary" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'IN_PROGRESS'))}>Tiếp tục</button>}
                </>
            )}

            {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && data.approvalStatus !== 'APPROVED' && data.approvalStatus !== 'REJECTED' && (
                 <button className="btn btn-sm btn-light border text-muted" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'CANCELLED'), 'Hủy yêu cầu?')}>Hủy</button>
            )}
        </div>

        <div className="d-none d-md-block text-end">
            <div className="fw-bold text-dark small">{data.category} REQUEST</div>
            <div className="text-muted font-monospace" style={{fontSize: '0.7rem'}}>{data._id}</div>
        </div>
      </div>

      {/* 2. BODY - Split View */}
      <div className="flex-grow-1 overflow-hidden d-flex">
         
         {/* --- LEFT COLUMN: MAIN CONTENT --- */}
         <div className="flex-grow-1 overflow-y-auto custom-scrollbar">
             
             {/* Status Bar */}
             <div className="border-bottom px-3 py-2 bg-white sticky-top d-flex justify-content-end align-items-center" style={{top: 0, zIndex: 90}}>
                {data.status === 'CANCELLED' ? <span className="badge bg-danger">ĐÃ HỦY</span> : 
                 data.approvalStatus === 'REJECTED' && isSimpleWorkflow ? <span className="badge bg-danger">ĐÃ TỪ CHỐI</span> : (
                    <div className="d-flex border rounded overflow-hidden">
                        {pipelineSteps.map((step) => (
                            <div key={step} className={`px-3 py-1 small fw-bold d-flex align-items-center ${step === currentStep ? 'bg-primary text-white' : 'bg-light text-muted border-end'}`}>
                                {step === 'WAITING_APPROVAL' ? 'CHỜ DUYỆT' : step === 'APPROVED' ? 'ĐÃ DUYỆT' : step === 'DRAFT' ? 'MỚI' : step}
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* Detail Form - Đã giảm padding p-5 -> p-4 */}
             <div className="p-4" style={{maxWidth: 1000, margin: '0 auto'}}>
                
                {/* Title Area - Đã giảm margin mb-5 -> mb-3 */}
                <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h3 className="fw-bold text-dark mb-1">{data.title}</h3>
                        {data.bookingRoomKey && (
                            <span className="badge bg-purple-subtle text-purple border border-purple px-2 py-1">
                                <i className="bi bi-geo-alt-fill me-1"></i> {data.bookingRoomKey}
                            </span>
                        )}
                    </div>
                    <div className={`d-flex flex-column align-items-center border rounded px-3 py-1 ${data.priority === 'URGENT' ? 'bg-danger-subtle text-danger border-danger' : 'bg-light text-muted'}`}>
                         <i className="bi bi-flag-fill fs-5 mb-0"></i>
                         <small className="fw-bold" style={{fontSize: '0.6rem'}}>{data.priority}</small>
                    </div>
                </div>

                {/* Info Grid - Đã giảm row g-5 -> g-4 và mb-5 -> mb-4 */}
                <div className="row g-4 mb-4">
                    <div className="col-md-6">
                        <table className="table table-borderless table-sm m-0">
                            <tbody>
                                <tr><td className="text-muted w-25">Người tạo:</td><td className="fw-bold">{data.requester?.name}</td></tr>
                                <tr><td className="text-muted">Email:</td><td>{data.requester?.email}</td></tr>
                                <tr><td className="text-muted">Ngày tạo:</td><td>{new Date(data.createdAt).toLocaleString()}</td></tr>
                            </tbody>
                        </table>
                    </div>
                    <div className="col-md-6 border-start">
                         <table className="table table-borderless table-sm m-0 ps-3">
                            <tbody>
                                <tr><td className="text-muted w-25">Loại:</td><td>{data.typeKey}</td></tr>
                                {!isSimpleWorkflow && (
                                    <tr>
                                        <td className="text-muted">Phân công:</td>
                                        <td>
                                            {isManager ? (
                                                <select className="form-select form-select-sm py-0 w-auto d-inline-block" 
                                                    value={data.assignedTo?._id || ''} 
                                                    onChange={(e) => e.target.value && handleAction(() => apiAssignRequest(token!, id!, e.target.value))}
                                                >
                                                    <option value="">-- Chọn --</option>
                                                    {staffList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                                </select>
                                            ) : <span className="fw-bold">{data.assignedTo?.name || 'Chưa giao'}</span>}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Tabs Navigation */}
                <ul className="nav nav-tabs mb-3 border-bottom">
                    <li className="nav-item">
                        <button className={`nav-link py-2 ${activeTab === 'desc' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('desc')}>Nội dung</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link py-2 ${activeTab === 'custom' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('custom')}>Chi tiết</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link py-2 ${activeTab === 'approval' ? 'active fw-bold' : ''}`} onClick={() => setActiveTab('approval')}>Quy trình duyệt</button>
                    </li>
                </ul>

                {/* Tabs Content */}
                <div className="min-vh-50">
                    {activeTab === 'desc' && (
                        <div className="animate__animated animate__fadeIn">
                            <div className="p-3 bg-light rounded border mb-3 text-secondary" style={{whiteSpace: 'pre-line'}}>
                                {data.description || 'Không có mô tả chi tiết.'}
                            </div>
                            {data.attachments && data.attachments.length > 0 && (
                                <div>
                                    <h6 className="small text-muted fw-bold mb-2 text-uppercase">Tài liệu đính kèm</h6>
                                    <div className="d-flex flex-wrap gap-2">
                                        {data.attachments.map((f, i) => (
                                            <a key={i} href={`${API_BASE_URL}/uploads/${f.path}`} target="_blank" className="btn btn-sm btn-white border d-flex align-items-center text-dark text-decoration-none shadow-sm">
                                                <i className="bi bi-file-earmark-text text-danger me-2"></i> {f.filename}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'custom' && (
                        <div className="animate__animated animate__fadeIn">
                            <table className="table table-bordered table-sm w-100">
                                <thead className="bg-light"><tr><th>Trường dữ liệu</th><th>Giá trị</th></tr></thead>
                                <tbody>
                                    {data.custom && Object.entries(data.custom).map(([k, v]) => (
                                        <tr key={k}><td className="text-muted w-25 text-capitalize">{k}</td><td className="fw-bold">{String(v)}</td></tr>
                                    ))}
                                    {(!data.custom || Object.keys(data.custom).length === 0) && <tr><td colSpan={2} className="text-center text-muted">Không có dữ liệu</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {activeTab === 'approval' && (
                        <div className="animate__animated animate__fadeIn">
                            <table className="table table-hover table-sm">
                                <thead><tr><th>Cấp</th><th>Người duyệt</th><th>Trạng thái</th><th>Ghi chú</th></tr></thead>
                                <tbody>
                                    {data.approvals?.map((step, idx) => (
                                        <tr key={idx}>
                                            <td>Bước {step.level} ({step.role})</td>
                                            <td>{step.approver?.name || '-'}</td>
                                            <td>
                                                {step.decision === 'APPROVED' ? <span className="text-success fw-bold"><i className="bi bi-check-circle"></i> Đồng ý</span> : 
                                                 step.decision === 'REJECTED' ? <span className="text-danger fw-bold"><i className="bi bi-x-circle"></i> Từ chối</span> : 
                                                 <span className="text-muted fst-italic">Đang chờ...</span>}
                                            </td>
                                            <td className="text-muted small">{step.comment}</td>
                                        </tr>
                                    ))}
                                    {(!data.approvals || data.approvals.length === 0) && <tr><td colSpan={4} className="text-center text-muted">Quy trình này không yêu cầu duyệt</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

             </div>
         </div>

         {/* --- RIGHT COLUMN: CHATTER (Sidebar) --- */}
         <div className="border-start bg-white d-flex flex-column h-100" style={{width: 360, minWidth: 360}}>
             
             <div className="p-2 border-bottom bg-light text-muted fw-bold small d-flex justify-content-between align-items-center">
                 <span><i className="bi bi-chat-dots-fill me-2"></i> THẢO LUẬN & LOG</span>
                 <span className="badge bg-secondary rounded-pill">{chatterMessages.length}</span>
             </div>
             
             {/* Input */}
             <div className="p-3 border-bottom bg-light-subtle">
                 <textarea 
                    className="form-control mb-2 shadow-sm border-0" 
                    rows={2} 
                    placeholder="Viết ghi chú..." 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    style={{resize: 'none', fontSize: '0.9rem'}}
                 />
                 <div className="d-flex justify-content-between align-items-center">
                     {isManager ? (
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="internalSwitch" checked={isInternalNote} onChange={e => setIsInternalNote(e.target.checked)} style={{cursor: 'pointer'}} />
                            <label className="form-check-label small text-muted" htmlFor="internalSwitch" style={{fontSize: '0.75rem'}}>Ghi chú nội bộ</label>
                        </div>
                     ) : <div></div>}
                     <button className="btn btn-sm btn-primary px-3 rounded-pill" onClick={() => {
                        if(comment.trim()) handleAction(() => apiAddComment(token!, id!, comment, isInternalNote)).then(() => setComment(''));
                     }}>
                        <i className="bi bi-send-fill"></i>
                     </button>
                 </div>
             </div>

             {/* Messages */}
             <div className="flex-grow-1 overflow-y-auto p-0 bg-white custom-scrollbar">
                 {chatterMessages.map((msg) => (
                     <div key={msg.id} className={`p-3 border-bottom ${msg.style} ${msg.isInternal ? 'border-start border-warning border-4' : ''}`}>
                         <div className="d-flex justify-content-between align-items-start mb-1">
                             <div className="d-flex align-items-center">
                                 <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2 small" style={{width: 24, height: 24}}>
                                     {msg.avatar}
                                 </div>
                                 <strong className="text-dark small">{msg.author}</strong>
                             </div>
                             <small className="text-muted" style={{fontSize: '0.65rem'}}>{msg.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} {msg.date.toLocaleDateString()}</small>
                         </div>
                         <div className="ps-4 ms-1 text-secondary small" style={{whiteSpace: 'pre-wrap'}}>
                            {msg.content}
                         </div>
                     </div>
                 ))}
             </div>
         </div>

      </div>
    </div>
  );
}