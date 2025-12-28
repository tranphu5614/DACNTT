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

// --- HELPER FUNCTIONS ---
const formatDate = (dateString: string | Date) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
};

const formatLabel = (str: string) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const getAvatarColor = (name: string) => {
  const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark', 'bg-info text-dark', 'bg-purple'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

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
      // Chỉ load staff list nếu là Manager và không phải loại request đặc biệt
      if (res.category && !['HR', 'ADMIN'].includes(res.category)) {
          apiGetStaffsByDept(token!, res.category)
            .then(setStaffList)
            .catch(() => {});
      }
    } catch (err: any) {
      alert(err.message || 'Failed to load data');
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
      avatar: c.author?.name?.[0] || '?',
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
      alert(e.message || 'Action failed');
    }
  };

  if (loading || !data) return (
    <div className="d-flex align-items-center justify-content-center h-100 bg-white">
        <div className="spinner-border text-primary"></div>
    </div>
  );

  // --- PERMISSIONS & WORKFLOW ---
  const isManager = hasRole('ADMIN') || hasRole('MANAGER') || hasRole('IT_MANAGER') || hasRole('HR_MANAGER');
  // Workflow đơn giản là HR hoặc Admin hoặc Đặt phòng
  const isSimpleWorkflow = ['HR', 'ADMIN'].includes(data.category) || !!data.bookingRoomKey;
  
  // [QUAN TRỌNG] Quyền thay đổi trạng thái (Manager hoặc Assignee)
  const canChangeState = (isManager || user?._id === data.assignedTo?._id) && !isSimpleWorkflow;
  
  // [MỚI] Quyền hủy: Chỉ Requester, Manager hoặc Assignee mới được hủy
  const canCancel = isManager || user?._id === data.requester?._id || user?._id === data.assignedTo?._id;

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
    <div className="d-flex flex-column h-100 bg-white font-sans">
      
      {/* 1. HEADER (CONTROL PANEL) */}
      <div className="border-bottom px-4 py-2 d-flex justify-content-between align-items-center bg-white sticky-top shadow-sm" style={{zIndex: 100, height: 60}}>
        
        <div className="d-flex gap-2 align-items-center">
            <button className="btn btn-light border rounded-circle d-flex align-items-center justify-content-center me-3" style={{width: 32, height: 32}} onClick={() => navigate(-1)} title="Back">
                <i className="bi bi-arrow-left"></i>
            </button>
            
            {/* Approval Actions (For Managers) */}
            {isManager && data.approvalStatus === 'PENDING' && (
                <>
                    <button className="btn btn-sm btn-success fw-semibold px-3 d-flex align-items-center" onClick={() => handleAction(() => apiApproveRequest(token!, id!, 'Approved'), 'Approve request?')}>
                        <i className="bi bi-check-lg me-2"></i> Approve
                    </button>
                    <button className="btn btn-sm btn-outline-danger px-3" onClick={() => {
                        const r = prompt('Reason for rejection?');
                        if(r) handleAction(() => apiRejectRequest(token!, id!, r));
                    }}>
                        Reject
                    </button>
                </>
            )}

            {/* Status Actions (For Assignee / IT Support) */}
            {canChangeState && (
                <>
                    {data.status === 'NEW' && <button className="btn btn-sm btn-primary px-3" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'IN_PROGRESS'))}>Start Progress</button>}
                    {data.status === 'IN_PROGRESS' && (
                        <>
                             <button className="btn btn-sm btn-success text-white px-3" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'COMPLETED'), 'Mark as Completed?')}>Mark Done</button>
                             <button className="btn btn-sm btn-warning text-dark border px-3" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'PENDING'))}>On Hold</button>
                        </>
                    )}
                    {data.status === 'PENDING' && <button className="btn btn-sm btn-primary px-3" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'IN_PROGRESS'))}>Resume</button>}
                </>
            )}

            {/* Cancel Action */}
            {canCancel && data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && data.approvalStatus !== 'APPROVED' && data.approvalStatus !== 'REJECTED' && (
                 <button className="btn btn-sm btn-light border text-muted px-3" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'CANCELLED'), 'Cancel request?')}>Cancel</button>
            )}
        </div>

        <div className="d-none d-md-block text-end">
            <div className="fw-bold text-dark" style={{fontSize: '0.9rem'}}>{data.category} REQUEST</div>
            <div className="text-muted font-monospace small">#{data._id.slice(-6).toUpperCase()}</div>
        </div>
      </div>

      {/* 2. BODY - Split View */}
      <div className="flex-grow-1 overflow-hidden d-flex bg-light">
         
         {/* --- LEFT COLUMN: MAIN CONTENT --- */}
         <div className="flex-grow-1 overflow-y-auto custom-scrollbar">
             
             {/* Status Pipeline Bar */}
             <div className="border-bottom px-4 py-3 bg-white d-flex justify-content-between align-items-center mb-3 shadow-sm">
                <div>
                     <span className={`badge rounded-pill px-3 py-2 ${data.priority === 'URGENT' ? 'bg-danger' : data.priority === 'HIGH' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                        {data.priority} PRIORITY
                     </span>
                </div>
                
                {data.status === 'CANCELLED' ? <span className="badge bg-secondary fs-6">CANCELLED</span> : 
                 data.approvalStatus === 'REJECTED' && isSimpleWorkflow ? <span className="badge bg-danger fs-6">REJECTED</span> : (
                    <div className="d-flex align-items-center">
                        {pipelineSteps.map((step, idx) => (
                            <div key={step} className="d-flex align-items-center">
                                <div className={`d-flex align-items-center justify-content-center rounded-circle small fw-bold border ${step === currentStep ? 'bg-primary text-white border-primary' : 'bg-white text-muted'}`} style={{width: 24, height: 24}}>
                                    {idx + 1}
                                </div>
                                <span className={`ms-2 small fw-bold ${step === currentStep ? 'text-primary' : 'text-muted'}`}>
                                    {formatLabel(step === 'WAITING_APPROVAL' ? 'WAITING' : step)}
                                </span>
                                {idx < pipelineSteps.length - 1 && <div className="mx-2 bg-secondary opacity-25" style={{width: 30, height: 2}}></div>}
                            </div>
                        ))}
                    </div>
                )}
             </div>

             {/* Document Paper Effect */}
             <div className="px-5 py-4 mx-auto bg-white rounded shadow-sm border" style={{maxWidth: 1000, minHeight: '80vh', marginTop: -10}}>
                
                {/* Header Title */}
                <div className="mb-4 pb-3 border-bottom">
                    <h2 className="fw-bold text-dark mb-2">{data.title}</h2>
                    <div className="d-flex gap-4 text-muted small">
                         <span><i className="bi bi-calendar3 me-1"></i> Created: {formatDate(data.createdAt)}</span>
                         <span><i className="bi bi-person me-1"></i> By: <span className="text-dark fw-semibold">{data.requester?.name}</span></span>
                         {data.bookingRoomKey && (
                            <span className="text-purple fw-bold"><i className="bi bi-geo-alt-fill me-1"></i> Room: {data.bookingRoomKey}</span>
                        )}
                    </div>
                </div>

                {/* Info Grid */}
                <div className="row g-4 mb-5">
                    <div className="col-md-6">
                        <h6 className="text-uppercase text-secondary small fw-bold mb-3 ls-1 border-bottom pb-2">Request Info</h6>
                        <div className="d-flex justify-content-between mb-2">
                             <span className="text-muted small">Category:</span>
                             <span className="fw-medium">{data.category}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                             <span className="text-muted small">Type:</span>
                             <span className="fw-medium">{formatLabel(data.typeKey)}</span>
                        </div>
                        <div className="d-flex justify-content-between mb-2">
                             <span className="text-muted small">Email:</span>
                             <a href={`mailto:${data.requester?.email}`} className="text-decoration-none small">{data.requester?.email}</a>
                        </div>
                    </div>

                    <div className="col-md-6">
                        <h6 className="text-uppercase text-secondary small fw-bold mb-3 ls-1 border-bottom pb-2">Workflow</h6>
                        <div className="d-flex justify-content-between mb-2">
                             <span className="text-muted small">Department:</span>
                             <span className="fw-medium">{data.department || data.category}</span>
                        </div>
                        
                        {!isSimpleWorkflow && (
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted small">Assigned To:</span>
                                <div>
                                    {isManager ? (
                                        <select className="form-select form-select-sm py-1 w-auto bg-light border-0 fw-medium" 
                                            value={data.assignedTo?._id || ''} 
                                            onChange={(e) => e.target.value && handleAction(() => apiAssignRequest(token!, id!, e.target.value))}
                                        >
                                            <option value="">-- Unassigned --</option>
                                            {staffList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                        </select>
                                    ) : (
                                        data.assignedTo ? (
                                            <div className="d-flex align-items-center">
                                                <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-2 small ${getAvatarColor(data.assignedTo.name)}`} style={{width: 24, height: 24}}>{data.assignedTo.name[0]}</div>
                                                <span className="fw-medium">{data.assignedTo.name}</span>
                                            </div>
                                        ) : <span className="text-muted fst-italic">Unassigned</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tabs Navigation */}
                <ul className="nav nav-tabs nav-tabs-custom mb-4 border-bottom">
                    <li className="nav-item">
                        <button className={`nav-link px-4 py-2 ${activeTab === 'desc' ? 'active fw-bold border-bottom border-primary border-2 text-primary' : 'text-muted'}`} onClick={() => setActiveTab('desc')}>Description & Files</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link px-4 py-2 ${activeTab === 'custom' ? 'active fw-bold border-bottom border-primary border-2 text-primary' : 'text-muted'}`} onClick={() => setActiveTab('custom')}>Detailed Specs</button>
                    </li>
                    <li className="nav-item">
                        <button className={`nav-link px-4 py-2 ${activeTab === 'approval' ? 'active fw-bold border-bottom border-primary border-2 text-primary' : 'text-muted'}`} onClick={() => setActiveTab('approval')}>Approvals</button>
                    </li>
                </ul>

                {/* Tabs Content */}
                <div className="min-vh-50">
                    
                    {/* Tab 1: Description */}
                    {activeTab === 'desc' && (
                        <div className="animate__animated animate__fadeIn">
                            <div className="p-4 bg-light rounded-3 border mb-4 text-dark" style={{whiteSpace: 'pre-line', lineHeight: '1.6'}}>
                                {data.description || <span className="text-muted fst-italic">No detailed description provided.</span>}
                            </div>
                            
                            <h6 className="small text-muted fw-bold mb-3 text-uppercase">Attachments ({data.attachments?.length || 0})</h6>
                            {data.attachments && data.attachments.length > 0 ? (
                                <div className="d-flex flex-wrap gap-3">
                                    {data.attachments.map((f, i) => (
                                        <a key={i} href={`${API_BASE_URL}/uploads/${f.path}`} target="_blank" className="card text-decoration-none shadow-sm border-0 bg-light" style={{width: 200}}>
                                            <div className="card-body p-3 d-flex align-items-center">
                                                <div className="bg-white rounded p-2 me-3 border">
                                                    <i className="bi bi-file-earmark-text text-danger fs-4"></i>
                                                </div>
                                                <div className="text-truncate">
                                                    <div className="text-dark small fw-bold text-truncate">{f.filename}</div>
                                                    <div className="text-muted" style={{fontSize: '0.7rem'}}>Click to view</div>
                                                </div>
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            ) : <div className="text-muted small">No attachments found.</div>}
                        </div>
                    )}

                    {/* Tab 2: Custom Fields */}
                    {activeTab === 'custom' && (
                        <div className="animate__animated animate__fadeIn">
                            <table className="table table-bordered table-striped-columns w-100">
                                <tbody>
                                    {data.custom && Object.entries(data.custom).map(([k, v]) => (
                                        <tr key={k}>
                                            <td className="text-secondary fw-medium w-25 bg-light px-3">{formatLabel(k)}</td>
                                            <td className="fw-bold px-3 text-dark">
                                                {typeof v === 'boolean' ? (v ? <span className="text-success">Yes</span> : <span className="text-danger">No</span>) : String(v)}
                                            </td>
                                        </tr>
                                    ))}
                                    {(!data.custom || Object.keys(data.custom).length === 0) && <tr><td colSpan={2} className="text-center text-muted py-4">No custom fields available.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tab 3: Approval */}
                    {activeTab === 'approval' && (
                        <div className="animate__animated animate__fadeIn">
                            <div className="table-responsive">
                                <table className="table align-middle">
                                    <thead className="bg-light"><tr><th className="fw-medium text-secondary">Step</th><th className="fw-medium text-secondary">Approver</th><th className="fw-medium text-secondary">Status</th><th className="fw-medium text-secondary">Comment</th></tr></thead>
                                    <tbody>
                                        {data.approvals?.map((step, idx) => (
                                            <tr key={idx}>
                                                <td>
                                                    <div className="fw-bold text-dark">Step {step.level}</div>
                                                    <div className="small text-muted">{step.role}</div>
                                                </td>
                                                <td>
                                                    {step.approver ? (
                                                         <div className="d-flex align-items-center">
                                                             <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-2 small ${getAvatarColor(step.approver.name)}`} style={{width: 28, height: 28}}>{step.approver.name[0]}</div>
                                                             <span>{step.approver.name}</span>
                                                         </div>
                                                    ) : '-'}
                                                </td>
                                                <td>
                                                    {step.decision === 'APPROVED' ? <span className="badge bg-success-subtle text-success border border-success px-2 py-1"><i className="bi bi-check-circle-fill me-1"></i> Approved</span> : 
                                                     step.decision === 'REJECTED' ? <span className="badge bg-danger-subtle text-danger border border-danger px-2 py-1"><i className="bi bi-x-circle-fill me-1"></i> Rejected</span> : 
                                                     <span className="badge bg-light text-muted border px-2 py-1">Pending</span>}
                                                </td>
                                                <td className="text-muted small fst-italic">{step.comment || '-'}</td>
                                            </tr>
                                        ))}
                                        {(!data.approvals || data.approvals.length === 0) && <tr><td colSpan={4} className="text-center text-muted py-4">No approval workflow configured.</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

             </div>
         </div>

         {/* --- RIGHT COLUMN: CHATTER --- */}
         <div className="border-start bg-white d-flex flex-column h-100 shadow-sm" style={{width: 380, minWidth: 380}}>
             
             <div className="p-3 border-bottom bg-light text-dark fw-bold small d-flex justify-content-between align-items-center">
                 <span><i className="bi bi-clock-history me-2"></i> ACTIVITY LOG</span>
                 <span className="badge bg-primary rounded-pill">{chatterMessages.length}</span>
             </div>
             
             {/* Input */}
             <div className="p-3 border-bottom bg-white">
                 <textarea 
                    className="form-control mb-2 bg-light border-0" 
                    rows={3} 
                    placeholder="Type a message or internal note..." 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    style={{resize: 'none', fontSize: '0.9rem'}}
                 />
                 <div className="d-flex justify-content-between align-items-center">
                     {isManager ? (
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="internalSwitch" checked={isInternalNote} onChange={e => setIsInternalNote(e.target.checked)} style={{cursor: 'pointer'}} />
                            <label className="form-check-label small text-muted fw-medium" htmlFor="internalSwitch">Internal Note</label>
                        </div>
                     ) : <div></div>}
                     <button className="btn btn-sm btn-primary px-3 rounded-pill fw-bold" disabled={!comment.trim()} onClick={() => {
                        if(comment.trim()) handleAction(() => apiAddComment(token!, id!, comment, isInternalNote)).then(() => setComment(''));
                     }}>
                        SEND <i className="bi bi-send-fill ms-1"></i>
                     </button>
                 </div>
             </div>

             {/* Messages */}
             <div className="flex-grow-1 overflow-y-auto p-0 bg-white custom-scrollbar">
                 {chatterMessages.map((msg) => (
                     <div key={msg.id} className={`p-3 border-bottom ${msg.style} ${msg.isInternal ? 'border-start border-warning border-4' : ''}`}>
                         <div className="d-flex justify-content-between align-items-start mb-2">
                             <div className="d-flex align-items-center">
                                 <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-2 small ${getAvatarColor(msg.author)}`} style={{width: 28, height: 28}}>
                                     {msg.avatar}
                                 </div>
                                 <div className="lh-1">
                                    <div className="fw-bold text-dark small">{msg.author}</div>
                                    <div className="text-muted" style={{fontSize: '0.65rem'}}>{msg.isInternal && <span className="text-warning fw-bold me-1">[INTERNAL]</span>}{formatDate(msg.date)}</div>
                                 </div>
                             </div>
                         </div>
                         <div className="ps-5 text-secondary small" style={{whiteSpace: 'pre-wrap', lineHeight: '1.5'}}>
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