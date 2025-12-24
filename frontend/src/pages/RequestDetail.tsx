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

  const [data, setData] = useState<MyRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<UserItem[]>([]);
  
  const [comment, setComment] = useState('');
  const [activeTab, setActiveTab] = useState<'desc' | 'custom' | 'approval'>('desc');
  const [isInternalNote, setIsInternalNote] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      const res = await apiGetRequestDetail(token!, id!);
      setData(res);
      // Chỉ load nhân viên nếu không phải là request đơn giản (như HR)
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

  // Logic Chatter
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

  const handleAction = async (actionFn: () => Promise<unknown>, confirmMsg?: string) => {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    try {
      await actionFn();
      await loadData(); 
    } catch (e: any) {
      alert(e.message || 'Lỗi thực hiện hành động');
    }
  };

  if (loading || !data) return <div className="p-5 text-center text-muted">Đang tải dữ liệu...</div>;

  // --- LOGIC PHÂN LOẠI QUY TRÌNH (WORKFLOW) ---
  const isManager = hasRole('ADMIN') || hasRole('MANAGER') || hasRole('IT_MANAGER') || hasRole('HR_MANAGER');
  
  // Các loại yêu cầu đơn giản (Chỉ cần Duyệt là xong)
  const isSimpleWorkflow = ['HR', 'ADMIN'].includes(data.category) || !!data.bookingRoomKey;

  // Quyền thay đổi trạng thái kỹ thuật (chỉ dùng cho IT)
  const canChangeState = (isManager || user?._id === data.assignedTo?._id) && !isSimpleWorkflow;

  // Pipeline Steps (Tùy biến theo Workflow)
  let pipelineSteps = ['NEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED'];
  let currentStep = data.status;

  if (isSimpleWorkflow) {
      // Workflow đơn giản: Nháp -> Chờ Duyệt -> Đã Duyệt / Từ Chối
      pipelineSteps = ['DRAFT', 'WAITING_APPROVAL', 'APPROVED'];
      
      // Map trạng thái dữ liệu sang trạng thái hiển thị
      if (data.approvalStatus === 'APPROVED') currentStep = 'APPROVED';
      else if (data.approvalStatus === 'REJECTED') currentStep = 'REJECTED'; // Sẽ xử lý hiển thị riêng
      else if (data.approvalStatus === 'PENDING') currentStep = 'WAITING_APPROVAL';
      else currentStep = 'DRAFT';
  }

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* === CONTROL PANEL === */}
      <div className="o_control_panel bg-white border-bottom px-3 py-2 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 100}}>
        <div className="d-flex gap-2">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)} title="Quay lại">
                <i className="bi bi-arrow-left"></i>
            </button>
            
            {/* 1. NÚT DUYỆT (Chung cho cả 2 quy trình) */}
            {isManager && data.approvalStatus === 'PENDING' && (
                <>
                    <button className="btn btn-sm btn-primary" onClick={() => handleAction(() => apiApproveRequest(token!, id!, 'Approved'), 'Xác nhận DUYỆT yêu cầu này?')}>
                        <i className="bi bi-check2-circle me-1"></i> Duyệt
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => {
                        const r = prompt('Lý do từ chối?');
                        if(r) handleAction(() => apiRejectRequest(token!, id!, r));
                    }}>
                        Từ chối
                    </button>
                </>
            )}

            {/* 2. NÚT XỬ LÝ KỸ THUẬT (Chỉ hiện với IT/Complex workflow) */}
            {canChangeState && (
                <>
                    {data.status === 'NEW' && (
                         <button className="btn btn-sm btn-primary" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'IN_PROGRESS'))}>
                            <i className="bi bi-play-fill me-1"></i> Bắt đầu
                         </button>
                    )}
                    {data.status === 'IN_PROGRESS' && (
                        <>
                             <button className="btn btn-sm btn-success" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'COMPLETED'), 'Xác nhận hoàn thành?')}>
                                <i className="bi bi-check-lg me-1"></i> Hoàn thành
                             </button>
                             <button className="btn btn-sm btn-outline-secondary" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'PENDING'))}>
                                <i className="bi bi-pause-fill me-1"></i> Tạm hoãn
                             </button>
                        </>
                    )}
                    {data.status === 'PENDING' && (
                         <button className="btn btn-sm btn-primary" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'IN_PROGRESS'))}>
                            <i className="bi bi-play-fill me-1"></i> Tiếp tục
                         </button>
                    )}
                </>
            )}

            {/* 3. NÚT CHUNG (Hủy / Reset) */}
            {data.status !== 'COMPLETED' && data.status !== 'CANCELLED' && data.approvalStatus !== 'APPROVED' && data.approvalStatus !== 'REJECTED' && (
                 <button className="btn btn-sm btn-outline-secondary" onClick={() => handleAction(() => apiUpdateStatus(token!, id!, 'CANCELLED'), 'Hủy yêu cầu?')}>
                    Hủy
                 </button>
            )}
        </div>

        <div className="d-none d-md-block text-muted small">
            <span className="fw-bold">{data.category}</span> / <span className="font-monospace">{data._id}</span>
        </div>
      </div>

      {/* === MAIN VIEW === */}
      <div className="d-flex flex-grow-1 overflow-hidden flex-column flex-lg-row">
         
         {/* SHEET */}
         <div className="flex-grow-1 overflow-y-auto p-3 p-lg-4 d-flex justify-content-center bg-light">
             <div className="w-100 bg-white border shadow-sm rounded" style={{maxWidth: 960, minHeight: 'fit-content'}}>
                
                {/* STATUS PIPELINE */}
                <div className="o_statusbar border-bottom p-2 d-flex justify-content-end align-items-center bg-white rounded-top">
                    {/* Hiển thị trạng thái đặc biệt: Đã hủy hoặc Từ chối */}
                    {data.status === 'CANCELLED' ? (
                        <span className="badge bg-danger fs-6">ĐÃ HỦY</span>
                    ) : data.approvalStatus === 'REJECTED' && isSimpleWorkflow ? (
                        <span className="badge bg-danger fs-6">ĐÃ TỪ CHỐI</span>
                    ) : (
                        <div className="d-flex bg-light rounded overflow-hidden border">
                            {pipelineSteps.map((step, idx) => (
                                <div 
                                    key={step} 
                                    className={`px-3 py-2 small fw-bold d-flex align-items-center ${
                                        step === currentStep
                                            ? 'bg-primary text-white shadow-sm' 
                                            : 'bg-light text-muted'
                                    }`}
                                    style={{
                                        clipPath: idx === 0 ? undefined : 'polygon(10px 0, 100% 0, 100% 100%, 10px 100%, 0 50%)',
                                        marginLeft: idx === 0 ? 0 : -5,
                                        paddingLeft: idx === 0 ? 15 : 20,
                                        zIndex: pipelineSteps.length - idx,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {step === 'WAITING_APPROVAL' ? 'CHỜ DUYỆT' : step === 'APPROVED' ? 'ĐÃ DUYỆT' : step === 'DRAFT' ? 'MỚI' : step}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* SHEET HEADER */}
                <div className="px-4 py-4">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                            <h1 className="h3 mb-1 text-primary">{data.title}</h1>
                            {data.bookingRoomKey && (
                                <span className="badge bg-purple-subtle text-purple border border-purple px-2">
                                    <i className="bi bi-calendar-event me-1"></i> Đặt phòng: {data.bookingRoomKey}
                                </span>
                            )}
                        </div>
                        
                        {/* Priority Badge (Chỉ hiện nếu có ý nghĩa) */}
                        <div className="d-flex flex-column align-items-center border rounded px-3 py-1 bg-light shadow-sm" style={{minWidth: 80}}>
                             <i className={`bi bi-flag-fill fs-5 ${data.priority === 'URGENT' ? 'text-danger' : data.priority === 'HIGH' ? 'text-warning' : 'text-info'}`}></i>
                             <small className="fw-bold" style={{fontSize: '0.7rem'}}>{data.priority}</small>
                        </div>
                    </div>

                    <div className="row g-4 mb-4">
                        <div className="col-md-6">
                            <table className="table table-borderless table-sm m-0">
                                <tbody>
                                    <tr><td className="text-muted w-25">Người tạo:</td><td className="fw-500">{data.requester?.name}</td></tr>
                                    <tr><td className="text-muted">Email:</td><td>{data.requester?.email}</td></tr>
                                    <tr><td className="text-muted">Ngày tạo:</td><td>{new Date(data.createdAt).toLocaleString()}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="col-md-6 border-start-lg">
                             <table className="table table-borderless table-sm m-0">
                                <tbody>
                                    <tr><td className="text-muted w-25">Loại yêu cầu:</td><td><span className="badge bg-secondary-subtle text-dark border">{data.typeKey}</span></td></tr>
                                    {/* Chỉ hiện Assignee nếu là quy trình phức tạp (IT) */}
                                    {!isSimpleWorkflow && (
                                        <tr>
                                            <td className="text-muted">Phân công:</td>
                                            <td>
                                                {isManager ? (
                                                    <select 
                                                        className="form-select form-select-sm py-0" 
                                                        value={data.assignedTo?._id || ''} 
                                                        onChange={(e) => {
                                                            if(e.target.value) handleAction(() => apiAssignRequest(token!, id!, e.target.value));
                                                        }}
                                                        style={{maxWidth: 200}}
                                                    >
                                                        <option value="">-- Chọn nhân viên --</option>
                                                        {staffList.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                                                    </select>
                                                ) : (
                                                    <span className="fw-medium">{data.assignedTo?.name || 'Chưa giao'}</span>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                    {/* Nếu là quy trình duyệt, hiện người duyệt */}
                                    {isSimpleWorkflow && data.approvalStatus !== 'NONE' && (
                                        <tr>
                                            <td className="text-muted">Trạng thái duyệt:</td>
                                            <td>
                                                <span className={`badge ${data.approvalStatus === 'APPROVED' ? 'bg-success' : data.approvalStatus === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                                    {data.approvalStatus}
                                                </span>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* TABS */}
                    <ul className="nav nav-tabs mb-3" role="tablist">
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'desc' ? 'active' : ''}`} onClick={() => setActiveTab('desc')}>Mô tả & File</button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'custom' ? 'active' : ''}`} onClick={() => setActiveTab('custom')}>Thông tin chi tiết</button>
                        </li>
                        <li className="nav-item">
                            <button className={`nav-link ${activeTab === 'approval' ? 'active' : ''}`} onClick={() => setActiveTab('approval')}>Lịch sử duyệt</button>
                        </li>
                    </ul>

                    <div className="tab-content" style={{minHeight: 200}}>
                        {activeTab === 'desc' && (
                            <div className="animate__animated animate__fadeIn">
                                <p className="text-break" style={{whiteSpace: 'pre-line', color: '#444'}}>{data.description}</p>
                                
                                {data.attachments && data.attachments.length > 0 && (
                                    <div className="mt-4 pt-3 border-top">
                                        <h6 className="small text-muted fw-bold mb-2">TỆP ĐÍNH KÈM</h6>
                                        <div className="d-flex flex-wrap gap-2">
                                            {data.attachments.map((f, i) => (
                                                <a key={i} href={`${API_BASE_URL}/uploads/${f.path}`} target="_blank" className="btn btn-sm btn-light border d-flex align-items-center text-dark text-decoration-none">
                                                    <i className="bi bi-paperclip text-primary me-2"></i> {f.filename}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'custom' && (
                            <div className="animate__animated animate__fadeIn">
                                <table className="table table-bordered table-sm w-100" style={{maxWidth: 600}}>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Trường dữ liệu</th>
                                            <th>Giá trị</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.custom && Object.entries(data.custom).map(([k, v]) => (
                                            <tr key={k}>
                                                <td className="bg-light w-25 text-capitalize text-muted small align-middle">{k}</td>
                                                <td className="fw-500">{String(v)}</td>
                                            </tr>
                                        ))}
                                        {(!data.custom || Object.keys(data.custom).length === 0) && (
                                            <tr><td colSpan={2} className="text-center text-muted">Không có dữ liệu bổ sung</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}

                         {activeTab === 'approval' && (
                            <div className="animate__animated animate__fadeIn">
                                <table className="table table-hover table-sm">
                                    <thead>
                                        <tr>
                                            <th>Cấp độ</th>
                                            <th>Vai trò</th>
                                            <th>Người duyệt</th>
                                            <th>Trạng thái</th>
                                            <th>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.approvals?.map((step, idx) => (
                                            <tr key={idx}>
                                                <td>Bước {step.level}</td>
                                                <td><span className="badge bg-light text-dark border">{step.role}</span></td>
                                                <td>{step.approver?.name || '-'}</td>
                                                <td>
                                                    {step.decision === 'APPROVED' ? <span className="text-success fw-bold"><i className="bi bi-check-circle"></i> Duyệt</span> : 
                                                     step.decision === 'REJECTED' ? <span className="text-danger fw-bold"><i className="bi bi-x-circle"></i> Từ chối</span> : 
                                                     <span className="text-muted fst-italic">Chờ xử lý...</span>}
                                                </td>
                                                <td className="text-muted small">{step.comment}</td>
                                            </tr>
                                        ))}
                                        {(!data.approvals || data.approvals.length === 0) && (
                                            <tr><td colSpan={5} className="text-center fst-italic text-muted">Không yêu cầu quy trình duyệt</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
             </div>
         </div>

         {/* CHATTER */}
         <div className="col-lg-4 col-xl-3 border-start bg-white d-flex flex-column h-100" style={{minWidth: 320}}>
             <div className="p-3 border-bottom bg-light text-muted fw-bold small d-flex align-items-center">
                 <i className="bi bi-chat-square-text-fill me-2"></i> Chatter
             </div>
             
             <div className="p-3 border-bottom bg-light-subtle">
                 <textarea 
                    className="form-control mb-2 shadow-sm" 
                    rows={2} 
                    placeholder="Gửi tin nhắn hoặc ghi chú..." 
                    value={comment} 
                    onChange={e => setComment(e.target.value)}
                    style={{resize: 'none', fontSize: '0.9rem'}}
                 />
                 <div className="d-flex justify-content-between align-items-center">
                     {isManager ? (
                        <div className="form-check form-switch">
                            <input className="form-check-input" type="checkbox" id="internalSwitch" checked={isInternalNote} onChange={e => setIsInternalNote(e.target.checked)} />
                            <label className="form-check-label small text-muted" htmlFor="internalSwitch">Internal Note</label>
                        </div>
                     ) : <div></div>}
                     
                     <button className="btn btn-sm btn-primary px-3" onClick={() => {
                        if(comment.trim()) handleAction(() => apiAddComment(token!, id!, comment, isInternalNote)).then(() => setComment(''));
                     }}>
                        <i className="bi bi-send-fill me-1"></i> Gửi
                     </button>
                 </div>
             </div>

             <div className="flex-grow-1 overflow-y-auto p-0 bg-white custom-scrollbar">
                 {chatterMessages.map((msg) => (
                     <div key={msg.id} className={`d-flex p-3 border-bottom ${msg.style} ${msg.isInternal ? 'border-start border-warning border-3' : ''}`}>
                         <div className="flex-shrink-0 me-3">
                             <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center shadow-sm" style={{width: 32, height: 32, fontSize: '0.8rem'}}>
                                 {msg.avatar}
                             </div>
                         </div>
                         <div className="flex-grow-1">
                             <div className="d-flex justify-content-between align-items-start mb-1">
                                 <strong className="text-dark" style={{fontSize: '0.85rem'}}>{msg.author}</strong>
                                 <small className="text-muted" style={{fontSize: '0.7rem'}}>
                                    {msg.date.toLocaleDateString()} {msg.date.getHours()}:{String(msg.date.getMinutes()).padStart(2, '0')}
                                 </small>
                             </div>
                             <div className="text-secondary" style={{fontSize: '0.85rem', whiteSpace: 'pre-wrap'}}>
                                {msg.content}
                             </div>
                             {msg.isInternal && (
                                <span className="badge bg-warning text-dark mt-1 border border-warning-subtle" style={{fontSize: '0.6rem'}}>INTERNAL NOTE</span>
                             )}
                         </div>
                     </div>
                 ))}
                 
                 {chatterMessages.length === 0 && (
                     <div className="text-center py-5 text-muted small">Chưa có lịch sử hoạt động</div>
                 )}
             </div>
         </div>

      </div>
    </div>
  );
}