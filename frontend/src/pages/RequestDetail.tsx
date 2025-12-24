import { useEffect, useState } from 'react';
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
import { apiGetStaffsByDept, UserItem } from '../api/users'; // <--- IMPORT MỚI

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user, hasRole } = useAuth();

  const [data, setData] = useState<MyRequestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // States
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState('');
  
  // [MỚI] State lưu danh sách nhân viên để hiển thị trong dropdown
  const [staffList, setStaffList] = useState<UserItem[]>([]);

  useEffect(() => {
    if (token && id) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, id]);

  // [MỚI] Effect phụ: Khi data ticket load xong, thì load tiếp danh sách nhân viên tương ứng
  useEffect(() => {
    if (token && data?.category) {
      loadStaffs(data.category);
    }
  }, [token, data?.category]);

  const loadData = async () => {
    try {
      const res = await apiGetRequestDetail(token!, id!);
      setData(res);
      if (res.assignedTo) setSelectedAssignee(res.assignedTo._id);
    } catch (err: any) {
      alert(err.message || 'Lỗi tải dữ liệu');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  // [MỚI] Hàm gọi API lấy nhân viên
  const loadStaffs = async (dept: string) => {
    try {
      const staffs = await apiGetStaffsByDept(token!, dept);
      setStaffList(staffs);
    } catch (e) {
      console.error("Lỗi tải danh sách nhân viên:", e);
    }
  };

  const performAction = async (action: () => Promise<void>) => {
    setActionLoading(true);
    try {
      await action();
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Có lỗi xảy ra');
    } finally {
      setActionLoading(false);
    }
  };

  // --- ACTIONS ---
  const handleApprove = async () => {
    if (!window.confirm('Bạn xác nhận DUYỆT yêu cầu này?')) return;
    performAction(async () => {
      await apiApproveRequest(token!, id!, 'Duyệt qua hệ thống.');
      alert('Đã duyệt thành công!');
    });
  };

  const handleReject = async () => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason) return;
    performAction(async () => {
      await apiRejectRequest(token!, id!, reason);
      alert('Đã từ chối yêu cầu.');
    });
  };

  const handleAssign = async () => {
    if (!selectedAssignee) return alert('Vui lòng chọn nhân viên!');
    performAction(async () => {
      await apiAssignRequest(token!, id!, selectedAssignee);
      alert('Giao việc thành công!');
    });
  };

  const handleUpdateStatus = async (status: string) => {
    const label = status === 'COMPLETED' ? 'hoàn thành' : 'hủy';
    if (!window.confirm(`Bạn chắc chắn muốn ${label} yêu cầu này?`)) return;
    performAction(async () => {
      await apiUpdateStatus(token!, id!, status);
      alert(`Đã cập nhật trạng thái: ${status}`);
    });
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    performAction(async () => {
      await apiAddComment(token!, id!, comment, isInternal);
      setComment('');
    });
  };

  if (loading) return <div className="p-5 text-center">Đang tải dữ liệu...</div>;
  if (!data) return <div className="p-5 text-center text-danger">Không tìm thấy yêu cầu</div>;

  // --- LOGIC PHÂN QUYỀN ---
  const isAdmin = hasRole('ADMIN');
  const isManager = isAdmin || hasRole('MANAGER') || hasRole('IT_MANAGER') || hasRole('HR_MANAGER');
  
  const isAssignee = user?._id === data.assignedTo?._id;
  const isRequester = user?._id === data.requester?._id;

  const showApproveActions = isManager && (data.approvalStatus === 'PENDING' || data.approvalStatus === 'IN_REVIEW');
  const canAssign = isManager && (data.approvalStatus === 'APPROVED' || data.approvalStatus === 'NONE');
  const showCompleteBtn = (isAssignee || isManager) && data.status === 'IN_PROGRESS';
  const showCancelBtn = (isRequester || isAdmin) && ['NEW', 'PENDING', 'IN_PROGRESS'].includes(data.status);
  const isOverdue = data.dueDate && new Date() > new Date(data.dueDate) && data.status !== 'COMPLETED' && data.status !== 'CANCELLED';

  return (
    <div className="container py-4">
      {/* HEADER */}
      <div className="d-flex flex-wrap justify-content-between align-items-start mb-4 border-bottom pb-3 gap-3">
        <div>
          <h2 className="mb-1">{data.title}</h2>
          <div className="text-muted small">
            Mã: <span className="font-monospace text-dark bg-light px-1 rounded">{data._id}</span> • 
            Tạo bởi: <strong>{data.requester?.name}</strong>
          </div>
        </div>
        <div className="d-flex gap-2">
           <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
             <i className="bi bi-arrow-left me-1"></i>Quay lại
           </button>
           {showCompleteBtn && (
             <button className="btn btn-success" onClick={() => handleUpdateStatus('COMPLETED')} disabled={actionLoading}>
               <i className="bi bi-check-circle-fill me-2"></i>Đã xử lý xong
             </button>
           )}
           {showCancelBtn && (
             <button className="btn btn-outline-danger" onClick={() => handleUpdateStatus('CANCELLED')} disabled={actionLoading}>
               <i className="bi bi-x-circle me-2"></i>Hủy yêu cầu
             </button>
           )}
        </div>
      </div>

      <div className="row g-4">
        {/* CỘT TRÁI */}
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light fw-bold">Thông tin chi tiết</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="text-muted small">Danh mục / Loại</label>
                  <div className="fw-medium">{data.category} / {data.typeKey}</div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Mức độ ưu tiên</label>
                  <div>
                    <span className={`badge ${data.priority === 'URGENT' ? 'bg-danger' : data.priority === 'HIGH' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                      {data.priority}
                    </span>
                  </div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Hạn xử lý (SLA)</label>
                  <div>
                    {data.dueDate ? (
                      <>
                        {new Date(data.dueDate).toLocaleString()}
                        {isOverdue && <span className="badge bg-danger ms-2 animate__animated animate__pulse animate__infinite">QUÁ HẠN</span>}
                      </>
                    ) : '—'}
                  </div>
                </div>
                <div className="col-12">
                  <label className="text-muted small">Mô tả</label>
                  <div className="p-3 bg-light rounded mt-1 border" style={{whiteSpace: 'pre-line'}}>
                    {data.description}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dữ liệu Custom */}
          {data.custom && Object.keys(data.custom).length > 0 && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light fw-bold">Dữ liệu nghiệp vụ</div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  {Object.entries(data.custom).map(([key, val]: any) => {
                     if (key === 'isSlaBreached') return null;
                     return (
                        <li key={key} className="list-group-item d-flex justify-content-between px-0">
                          <span className="text-muted text-capitalize">{key}</span>
                          <span className="fw-medium text-end">{String(val)}</span>
                        </li>
                     )
                  })}
                </ul>
              </div>
            </div>
          )}

          {/* File đính kèm */}
          {data.attachments && data.attachments.length > 0 && (
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light fw-bold">Tệp đính kèm</div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {data.attachments.map((file, idx) => (
                    <a 
                      key={idx} 
                      href={`http://localhost:3000/uploads/${file.path}`} 
                      target="_blank" 
                      className="btn btn-sm btn-outline-primary"
                      rel="noreferrer"
                    >
                      <i className="bi bi-paperclip me-2"></i>{file.filename}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Bình luận */}
          <div className="card shadow-sm">
            <div className="card-header bg-light fw-bold d-flex justify-content-between align-items-center">
              <span>Thảo luận</span>
              <span className="badge bg-secondary">{data.comments?.length || 0}</span>
            </div>
            <div className="card-body">
              <div className="mb-4" style={{ maxHeight: 400, overflowY: 'auto' }}>
                {data.comments?.length === 0 && <p className="text-muted text-center">Chưa có bình luận nào.</p>}
                {data.comments?.map((c) => (
                  <div key={c._id} className={`d-flex mb-3 ${c.isInternal ? 'opacity-75 bg-light-warning' : ''}`}>
                    <div className="flex-shrink-0">
                      <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center fw-bold" style={{width: 32, height: 32}}>
                        {c.author?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <div className="bg-light p-2 rounded border">
                        <div className="d-flex justify-content-between">
                          <strong>{c.author?.name}</strong>
                          <small className="text-muted" style={{fontSize: '0.75rem'}}>{new Date(c.createdAt).toLocaleString()}</small>
                        </div>
                        <p className="mb-0 text-break">{c.content}</p>
                      </div>
                      {c.isInternal && <span className="badge bg-warning text-dark mt-1" style={{fontSize: '0.65rem'}}>INTERNAL NOTE</span>}
                    </div>
                  </div>
                ))}
              </div>
              
              <form onSubmit={handleSubmitComment}>
                <div className="input-group">
                  <input type="text" className="form-control" placeholder="Viết bình luận..." value={comment} onChange={e => setComment(e.target.value)} />
                  <button className="btn btn-primary" disabled={actionLoading}>Gửi</button>
                </div>
                {isManager && (
                   <div className="form-check mt-2">
                     <input className="form-check-input" type="checkbox" id="internalCheck" checked={isInternal} onChange={e => setIsInternal(e.target.checked)} />
                     <label className="form-check-label small text-muted" htmlFor="internalCheck">Ghi chú nội bộ</label>
                   </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI */}
        <div className="col-lg-4">
          <div className="card shadow-sm mb-4 border-top border-4 border-primary">
            <div className="card-body">
              <h6 className="text-uppercase text-muted fw-bold small mb-3">Tiến độ</h6>
              <div className="d-flex justify-content-between mb-2">
                <span>Trạng thái:</span>
                <span className={`badge fs-6 ${data.status === 'COMPLETED' ? 'bg-success' : data.status === 'CANCELLED' ? 'bg-danger' : 'bg-primary'}`}>{data.status}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span>Duyệt:</span>
                <span className={`badge ${data.approvalStatus === 'APPROVED' ? 'bg-success' : data.approvalStatus === 'PENDING' ? 'bg-warning text-dark' : 'bg-secondary'}`}>{data.approvalStatus}</span>
              </div>

              {showApproveActions && (
                <div className="d-grid gap-2 pt-2 border-top">
                  <button className="btn btn-success btn-sm" onClick={handleApprove} disabled={actionLoading}>Duyệt ngay</button>
                  <button className="btn btn-outline-danger btn-sm" onClick={handleReject} disabled={actionLoading}>Từ chối</button>
                </div>
              )}
            </div>
          </div>

          <div className="card shadow-sm mb-4">
            <div className="card-body">
              <h6 className="text-uppercase text-muted fw-bold small mb-3">Phân công</h6>
              
              {data.assignedTo ? (
                <div className="d-flex align-items-center p-2 bg-light rounded border">
                  <i className="bi bi-person-workspace fs-3 me-3 text-primary"></i>
                  <div>
                    <div className="fw-bold">{data.assignedTo.name}</div>
                    <div className="small text-muted">{data.assignedTo.email}</div>
                  </div>
                </div>
              ) : (
                <div className="text-muted small fst-italic mb-2">Chưa phân công</div>
              )}

              {/* [QUAN TRỌNG] Dropdown load từ API theo Category */}
              {isManager && (
                <div className="mt-3 pt-3 border-top">
                  {canAssign ? (
                    <>
                      <label className="form-label small fw-bold">Nhân viên {data.category}:</label>
                      <div className="input-group input-group-sm">
                        <select 
                          className="form-select" 
                          value={selectedAssignee} 
                          onChange={(e) => setSelectedAssignee(e.target.value)}
                        >
                          <option value="">-- Chọn nhân viên --</option>
                          {staffList.map(u => (
                            <option key={u._id} value={u._id}>{u.name} ({u.email})</option>
                          ))}
                          {staffList.length === 0 && <option disabled>Không có nhân viên {data.category}</option>}
                        </select>
                        <button className="btn btn-primary" onClick={handleAssign} disabled={actionLoading}>Lưu</button>
                      </div>
                    </>
                  ) : (
                    <div className="alert alert-warning small mb-0 p-2">
                       <i className="bi bi-lock-fill me-1"></i> Cần duyệt trước.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Lịch sử duyệt */}
          {data.approvals && data.approvals.length > 0 && (
             <div className="card shadow-sm">
               <div className="card-header bg-white fw-bold small">Quy trình duyệt</div>
               <ul className="list-group list-group-flush small">
                 {data.approvals.map((step, idx) => (
                   <li key={idx} className="list-group-item">
                     <div className="d-flex justify-content-between align-items-center">
                       <strong>Bước {step.level}: {step.role}</strong>
                       {step.decision === 'APPROVED' ? <span className="text-success"><i className="bi bi-check"></i></span> : 
                        step.decision === 'REJECTED' ? <span className="text-danger"><i className="bi bi-x"></i></span> : 
                        <span className="text-muted"><i className="bi bi-hourglass"></i></span>}
                     </div>
                     {step.decision && (
                        <div className="mt-1 text-muted" style={{fontSize: '0.85em'}}>
                           <div>Bởi: {step.approver?.name || 'Admin'}</div>
                           {step.comment && <div>Note: "{step.comment}"</div>}
                        </div>
                     )}
                   </li>
                 ))}
               </ul>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}