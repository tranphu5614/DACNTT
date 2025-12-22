import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  apiGetRequestDetail, 
  apiAddComment, 
  apiAssignRequest, 
  apiApproveRequest, 
  apiRejectRequest,
  MyRequestItem 
} from '../api/requests';
import { apiGetCatalog, CatalogItem, CatalogField } from '../api/catalog'; 
import { apiGetAllUsers } from '../api/users'; // API lấy danh sách user để assign

function formatDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, hasRole } = useAuth();
  
  // State dữ liệu
  const [data, setData] = useState<MyRequestItem | null>(null); 
  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null); 
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);

  // State thao tác
  const [comment, setComment] = useState(''); // Comment duyệt
  const [discussionText, setDiscussionText] = useState(''); // Comment trao đổi
  const [selectedAssignee, setSelectedAssignee] = useState('');

  // State UI
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quyền hạn
  const isManager = hasRole('ADMIN') || hasRole('MANAGER') || hasRole('IT_MANAGER') || hasRole('HR_MANAGER');

  useEffect(() => {
    if (!token || !id) return;
    loadData();
    if (isManager) {
      loadUsers();
    }
  }, [id, token]);

  const loadData = async () => {
    try {
      const requestData = await apiGetRequestDetail(token!, id!);
      setData(requestData);
      
      // Load cấu hình Dynamic Form nếu có
      if (requestData?.category && requestData?.typeKey) {
          const catalog = await apiGetCatalog(token!, requestData.category);
          const foundItem = catalog.find(c => c.typeKey === requestData.typeKey);
          setCatalogItem(foundItem ?? null);
      }

      if (requestData.assignedTo) {
        setSelectedAssignee(requestData.assignedTo._id);
      }

      setError(null);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Không tải được yêu cầu');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const list = await apiGetAllUsers(token!);
      setAssignableUsers(list);
    } catch (e) {
      console.error("Failed to load users", e);
    }
  };

  const handleReload = async () => {
    await loadData();
  };

  // --- ACTIONS ---

  const handleSendDiscussion = async () => {
    if (!discussionText.trim()) return;
    try {
      await apiAddComment(token!, id!, discussionText);
      setDiscussionText('');
      handleReload();
    } catch (e) {
      alert('Gửi bình luận thất bại');
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return;
    if (!confirm(`Giao ticket này cho user đã chọn?`)) return;
    try {
      await apiAssignRequest(token!, id!, selectedAssignee);
      alert('Giao việc thành công!');
      handleReload();
    } catch (e) {
      alert('Lỗi khi giao việc');
    }
  };

  const doApprovalAction = async (type: 'approve' | 'reject') => {
    if (!confirm(`Bạn chắc chắn muốn ${type === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu này?`)) return;
    setActionLoading(true);
    try {
      if (type === 'approve') {
        await apiApproveRequest(token!, id!, comment);
      } else {
        await apiRejectRequest(token!, id!, comment);
      }
      setComment('');
      await handleReload();
      alert('Thao tác thành công!');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  // --- RENDER LOGIC ---

  if (!token) return <div className="container py-4">Cần đăng nhập.</div>;
  if (loading) return <div className="container py-4">Đang tải...</div>;
  if (error) return <div className="container py-4 text-danger">{error}</div>;
  if (!data) return null;

  // Logic duyệt (Giữ nguyên từ code cũ của bạn)
  const approvals = data.approvals || [];
  const approvalStatus = data.approvalStatus || 'NONE';
  const currentLevel = data.currentApprovalLevel || 0;
  const myRoles: string[] = user?.roles || [];
  const isMine = user?._id === (data.requester as any)?._id; // Sửa lại check ID cho chắc chắn

  const nextLevel = currentLevel + 1;
  const nextStep = approvals.find((a: any) => a.level === nextLevel);

  const canApproveNormal =
    approvalStatus !== 'APPROVED' &&
    approvalStatus !== 'REJECTED' &&
    nextStep &&
    myRoles.includes(nextStep.role);

  const canApproveForce =
    (approvals.length === 0 || approvalStatus === 'NONE') &&
    (myRoles.includes('ADMIN') || myRoles.includes('MANAGER') || myRoles.includes('HR_MANAGER'));

  const canApprove = !isMine && (canApproveNormal || canApproveForce);

  // Render Dynamic Fields
  const renderCustom = () => {
    const c = (data as any).custom || {};
    // ... (Giữ nguyên logic render custom field của bạn, chỉ copy lại phần quan trọng)
    
    if (data.typeKey === 'meeting_room_booking') {
       // Code hiển thị phòng họp (như bạn đã viết)
       return (
        <dl className="row mb-0">
          <dt className="col-sm-4 text-muted">Phòng</dt>
          <dd className="col-sm-8 fw-bold text-primary">{c.roomKey}</dd>
          <dt className="col-sm-4 text-muted">Thời gian</dt>
          <dd className="col-sm-8">{c.bookingDate} ({c.fromTime} - {c.toTime})</dd>
        </dl>
       );
    }

    // Render generic fields
    const fieldMap = new Map<string, CatalogField>();
    if (catalogItem) catalogItem.fields.forEach(f => fieldMap.set(f.key, f as CatalogField));
    const keys = Object.keys(c);
    
    if (!keys.length) return <p className="mb-0 text-muted">Không có dữ liệu bổ sung.</p>;
    
    return (
      <dl className="row mb-0">
        {keys.map((k) => (
          <React.Fragment key={k}>
            <dt className="col-sm-4 text-muted text-truncate">{fieldMap.get(k)?.label || k}</dt>
            <dd className="col-sm-8 text-break">{String(c[k])}</dd>
          </React.Fragment>
        ))}
      </dl>
    );
  };

  return (
    <div className="container py-4" style={{ maxWidth: 1100 }}>
      {/* HEADER */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="mb-1">{data.title || <span className="text-muted fst-italic">(Không tiêu đề)</span>}</h2>
          <div className="text-muted small">Mã yêu cầu: <code>{data._id}</code></div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>← Quay lại</button>
          {canApprove && (
            <>
              <button className="btn btn-success" onClick={() => doApprovalAction('approve')} disabled={actionLoading}>
                {actionLoading ? '...' : '✅ Duyệt'}
              </button>
              <button className="btn btn-outline-danger" onClick={() => doApprovalAction('reject')} disabled={actionLoading}>
                ❌ Từ chối
              </button>
            </>
          )}
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT COLUMN */}
        <div className="col-md-8">
          {/* 1. THÔNG TIN CHUNG */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-light fw-bold">Thông tin chung</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="text-muted small">Trạng thái</label>
                  <div>
                    <span className={`badge ${data.status === 'COMPLETED' ? 'bg-success' : 'bg-primary'}`}>
                      {data.status}
                    </span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Mức độ ưu tiên</label>
                  <div>
                    <span className={`badge ${data.priority === 'URGENT' ? 'bg-danger' : data.priority === 'HIGH' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                      {data.priority || 'MEDIUM'}
                    </span>
                  </div>
                </div>
                <div className="col-sm-6">
                    <label className="text-muted small">Người tạo</label>
                    <div className="fw-medium">{(data.requester as any)?.name}</div>
                </div>
                <div className="col-sm-6">
                    <label className="text-muted small">Ngày tạo</label>
                    <div>{formatDate(data.createdAt)}</div>
                </div>
              </div>
              <hr className="my-3" />
              <h6 className="fw-bold mb-2">Mô tả</h6>
              <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap' }}>{data.description}</p>
              
              {/* Attachments */}
              {data.attachments && data.attachments.length > 0 && (
                 <div className="mt-3 p-3 bg-light rounded border">
                    <h6 className="small fw-bold text-muted mb-2">Tệp đính kèm:</h6>
                    <ul className="list-unstyled mb-0">
                      {data.attachments.map((f: any, idx: number) => (
                        <li key={idx} className="mb-1">
                            <i className="bi bi-paperclip me-2"></i>
                            <a href={`http://localhost:3000/uploads/${f.path}`} target="_blank" rel="noreferrer">
                                {f.filename}
                            </a> 
                            <span className="text-muted ms-2 small">({Math.round(f.size / 1024)} KB)</span>
                        </li>
                      ))}
                    </ul>
                 </div>
              )}
            </div>
          </div>

          {/* 2. DỮ LIỆU CHI TIẾT (DYNAMIC FORM) */}
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-light fw-bold">Dữ liệu chi tiết</div>
            <div className="card-body">
              {renderCustom()}
            </div>
          </div>

          {/* 3. THẢO LUẬN / COMMENTS (NEW FEATURE) */}
          <div className="card shadow-sm">
            <div className="card-header bg-white d-flex align-items-center gap-2">
                <i className="bi bi-chat-dots-fill text-primary"></i>
                <h6 className="mb-0 fw-bold">Thảo luận</h6>
            </div>
            <div className="card-body bg-light">
              {/* List Comments */}
              <div className="mb-3">
                {(!data.comments || data.comments.length === 0) && (
                    <p className="text-center text-muted small py-3">Chưa có thảo luận nào.</p>
                )}
                {data.comments?.map((c: any, idx: number) => (
                    <div key={idx} className="d-flex gap-2 mb-3">
                        <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{width: 32, height: 32}}>
                            {c.author?.name?.[0] || 'U'}
                        </div>
                        <div className="flex-grow-1">
                            <div className="bg-white p-2 rounded border shadow-sm">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <strong className="small">{c.author?.name}</strong>
                                    <span className="text-muted" style={{fontSize: '0.75rem'}}>{formatDate(c.createdAt)}</span>
                                </div>
                                <div className="text-dark small">{c.content}</div>
                            </div>
                        </div>
                    </div>
                ))}
              </div>

              {/* Input Comment */}
              <div className="input-group">
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Viết bình luận..." 
                  value={discussionText}
                  onChange={(e) => setDiscussionText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendDiscussion()}
                />
                <button className="btn btn-primary" onClick={handleSendDiscussion}>
                    <i className="bi bi-send-fill"></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col-md-4">
          
          {/* A. ASSIGNEE BOX (NEW FEATURE) */}
          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h6 className="card-title text-uppercase text-muted small fw-bold mb-3">Người xử lý</h6>
              
              {data.assignedTo ? (
                <div className="d-flex align-items-center gap-2 mb-3">
                   <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center" style={{width: 40, height: 40}}>
                      {data.assignedTo.name?.[0]}
                   </div>
                   <div>
                      <div className="fw-bold">{data.assignedTo.name}</div>
                      <div className="small text-muted">{data.assignedTo.email}</div>
                   </div>
                </div>
              ) : (
                <div className="alert alert-warning small mb-3">Chưa có người xử lý</div>
              )}

              {/* Chỉ Manager mới được Assign */}
              {isManager && (
                <div className="pt-3 border-top">
                  <label className="form-label small fw-bold">Phân công cho:</label>
                  <div className="d-flex gap-2">
                    <select 
                      className="form-select form-select-sm" 
                      value={selectedAssignee} 
                      onChange={(e) => setSelectedAssignee(e.target.value)}
                    >
                      <option value="">-- Chọn nhân viên --</option>
                      {assignableUsers.map(u => (
                        <option key={u._id} value={u._id}>{u.name} - {u.email}</option>
                      ))}
                    </select>
                    <button className="btn btn-sm btn-outline-primary" onClick={handleAssign}>Lưu</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* B. APPROVAL BOX */}
          <div className="card shadow-sm mb-4">
             {/* ... (Giữ nguyên UI Approval box từ code cũ của bạn) */}
             <div className="card-header bg-light fw-bold d-flex justify-content-between align-items-center">
                <span>Quy trình duyệt</span>
                <span className={`badge ${approvalStatus === 'APPROVED' ? 'bg-success' : approvalStatus === 'REJECTED' ? 'bg-danger' : 'bg-warning text-dark'}`}>
                    {approvalStatus}
                </span>
             </div>
             <ul className="list-group list-group-flush">
                {approvals.length === 0 ? (
                   <li className="list-group-item text-muted fst-italic small">Không yêu cầu duyệt.</li>
                ) : (
                   approvals.map((a: any, idx: number) => (
                      <li key={idx} className="list-group-item">
                         <div className="d-flex justify-content-between mb-1">
                            <strong className="small">Cấp {a.level}: {a.role}</strong>
                            {a.decision ? (
                               <span className={`badge ${a.decision==='APPROVED'?'bg-success':'bg-danger'}`}>{a.decision}</span>
                            ) : (<span className="badge bg-secondary">PENDING</span>)}
                         </div>
                         {a.decision && (
                            <div className="small text-muted bg-light p-1 rounded">
                               {a.comment && <div className="fst-italic">"{a.comment}"</div>}
                               <div style={{fontSize: 11}}>By: {(a.approver as any)?.name} at {formatDate(a.approvedAt)}</div>
                            </div>
                         )}
                      </li>
                   ))
                )}
             </ul>
             
             {/* Textarea for Approval Decision */}
             {canApprove && (
                <div className="card-body border-top">
                   <label className="form-label small fw-bold">Ghi chú duyệt:</label>
                   <textarea
                      className="form-control form-control-sm"
                      rows={2}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Nhập lý do..."
                   />
                </div>
             )}
          </div>

        </div>
      </div>
    </div>
  );
}