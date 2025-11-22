import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { apiGetCatalog, CatalogItem, CatalogField } from '../api/catalog'; 

function formatDate(v?: string) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

interface RequestData {
    _id: string;
    category: 'HR' | 'IT';
    typeKey: string;
    title?: string;
    description?: string;
    priority?: string;
    status: string;
    custom?: Record<string, any>;
    requester: any; 
    attachments?: any[];
    approvalStatus: 'NONE' | 'PENDING' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';
    currentApprovalLevel: number;
    approvals: any[];
    createdAt: string;
    updatedAt: string;
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [data, setData] = useState<RequestData | null>(null); 
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalogItem, setCatalogItem] = useState<CatalogItem | null>(null); 

  useEffect(() => {
    if (!token) return;

    const loadData = async () => {
      try {
        const res = await api.get<RequestData>(`/requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const requestData = res.data; 
        setData(requestData);
        
        if (requestData?.category && requestData?.typeKey) {
            const catalog = await apiGetCatalog(token, requestData.category);
            const foundItem = catalog.find(c => c.typeKey === requestData.typeKey);
            setCatalogItem(foundItem ?? null);
        }

        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Không tải được yêu cầu');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, token]);

  const reload = async () => {
    if (!token || !id) return;
    try {
      const res = await api.get<RequestData>(`/requests/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const requestData = res.data; 
      setData(requestData);
      
      if (requestData?.category && requestData?.typeKey && !catalogItem) {
        const catalog = await apiGetCatalog(token, requestData.category);
        const foundItem = catalog.find(c => c.typeKey === requestData.typeKey);
        setCatalogItem(foundItem ?? null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!token) return <div className="container py-4">Cần đăng nhập.</div>;
  if (loading) return <div className="container py-4">Đang tải...</div>;
  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
            Quay lại
          </button>
        </div>
      </div>
    );
  }
  
  if (!data) return null;

  const approvals = data.approvals || [];
  const approvalStatus = data.approvalStatus || 'NONE';
  const currentLevel = data.currentApprovalLevel || 0;
  const myRoles: string[] = user?.roles || [];

  const isMine = user?._id === data.requester || user?._id === (data.requester as any)?._id;

  const nextLevel = currentLevel + 1;
  const nextStep = approvals.find((a: any) => a.level === nextLevel);

  const canApproveNormal =
    approvalStatus !== 'APPROVED' &&
    approvalStatus !== 'REJECTED' &&
    nextStep &&
    myRoles.includes(nextStep.role);

  const canApproveForce =
    (approvals.length === 0 || approvalStatus === 'NONE') &&
    (myRoles.includes('ADMIN') || myRoles.includes('HR_MANAGER') || myRoles.includes('IT_MANAGER'));

  const canApprove = !isMine && (canApproveNormal || canApproveForce);

  const doAction = async (type: 'approve' | 'reject') => {
    if (!confirm(`Bạn chắc chắn muốn ${type === 'approve' ? 'duyệt' : 'từ chối'} yêu cầu này?`)) return;
    setActionLoading(true);
    try {
      await api.patch(
        `/requests/${id}/${type}`,
        { comment },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComment('');
      await reload();
      alert('Thao tác thành công!');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const renderCustom = () => {
    const c = data.custom || {};
    const fieldMap = new Map<string, CatalogField>();
    
    if (catalogItem) {
        catalogItem.fields.forEach(f => fieldMap.set(f.key, f as CatalogField));
    }
    
    // [UPDATED] Hiển thị thông tin phòng họp mới (Ngày + Giờ)
    if (data.typeKey === 'meeting_room_booking') {
      return (
        <dl className="row mb-0">
          <dt className="col-sm-4 text-muted">Loại phòng</dt>
          <dd className="col-sm-8">{c.size || '—'}</dd>
          
          <dt className="col-sm-4 text-muted">Ngày đặt</dt>
          <dd className="col-sm-8">
            {c.bookingDate ? new Date(c.bookingDate).toLocaleDateString() : '—'}
          </dd>
          
          <dt className="col-sm-4 text-muted">Thời gian</dt>
          <dd className="col-sm-8">
            {c.fromTime ? c.fromTime : '—'} ➔ {c.toTime ? c.toTime : '—'}
          </dd>
          
          <dt className="col-sm-4 text-muted">Phòng</dt>
          <dd className="col-sm-8 fw-bold text-primary">{c.roomKey || '—'}</dd>
        </dl>
      );
    }

    const keys = Object.keys(c);
    if (!keys.length) return <p className="mb-0 text-muted">Không có dữ liệu bổ sung.</p>;
    return (
      <dl className="row mb-0">
        {keys.map((k) => (
          <React.Fragment key={k}>
            <dt className="col-sm-4 text-muted text-truncate" title={k}>
              {fieldMap.get(k)?.label || k}
            </dt>
            <dd className="col-sm-8 text-break">
              {fieldMap.get(k)?.type === 'date' && c[k] ? new Date(c[k]).toLocaleDateString() : 
               fieldMap.get(k)?.type === 'datetime' && c[k] ? new Date(c[k]).toLocaleString() :
               typeof c[k] === 'object' ? JSON.stringify(c[k]) : String(c[k])}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    );
  };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="mb-1">
            {data.title || <span className="text-muted fst-italic">(Không tiêu đề)</span>}
          </h2>
          <div className="text-muted small">
            Mã yêu cầu: <code>{data._id}</code>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            ← Quay lại
          </button>
          {canApprove && (
            <>
              <button
                className="btn btn-success"
                onClick={() => doAction('approve')}
                disabled={actionLoading}
              >
                {actionLoading ? 'Đang xử lý...' : '✅ Duyệt'}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => doAction('reject')}
                disabled={actionLoading}
              >
                ❌ Từ chối
              </button>
            </>
          )}
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          <div className="card mb-4 shadow-sm">
            <div className="card-header bg-light fw-bold">Thông tin chung</div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-sm-6">
                  <label className="text-muted small">Loại yêu cầu</label>
                  <div>{data.typeKey}</div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Danh mục</label>
                  <div><span className="badge bg-secondary">{data.category}</span></div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Mức độ ưu tiên</label>
                  <div>
                    {data.priority ? (
                      <span className={`badge ${data.priority === 'URGENT' ? 'bg-danger' : data.priority === 'HIGH' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                        {data.priority}
                      </span>
                    ) : '—'}
                  </div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Trạng thái</label>
                  <div><span className="badge bg-primary">{data.status}</span></div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Người tạo</label>
                  <div className="text-truncate" title={(data.requester as any)?.email}>
                    {(data.requester as any)?.name || String(data.requester)}
                    {isMine && <span className="badge bg-light text-dark ms-1 border">Tôi</span>}
                  </div>
                </div>
                <div className="col-sm-6">
                  <label className="text-muted small">Ngày tạo</label>
                  <div>{formatDate(data.createdAt)}</div>
                </div>
              </div>

              <hr className="my-3" />

              <h6 className="fw-bold mb-2">Mô tả</h6>
              <p className="mb-0 text-break" style={{ whiteSpace: 'pre-wrap' }}>
                {data.description || <span className="text-muted fst-italic">Không có mô tả</span>}
              </p>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light fw-bold">Dữ liệu chi tiết</div>
            <div className="card-body">
              {renderCustom()}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light fw-bold d-flex justify-content-between align-items-center">
              <span>Quy trình duyệt</span>
              <span
                className={
                  'badge ' +
                  (approvalStatus === 'APPROVED'
                    ? 'bg-success'
                    : approvalStatus === 'REJECTED'
                    ? 'bg-danger'
                    : 'bg-warning text-dark')
                }
              >
                {approvalStatus}
              </span>
            </div>
            <ul className="list-group list-group-flush">
              {approvals.length === 0 ? (
                <li className="list-group-item text-muted fst-italic">Không yêu cầu duyệt.</li>
              ) : (
                approvals.map((a: any, idx: number) => {
                  const isCurrentStep = !a.decision && a.level === nextLevel && approvalStatus !== 'REJECTED';
                  return (
                    <li key={idx} className={`list-group-item ${isCurrentStep ? 'bg-primary-subtle' : ''}`}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <strong>Cấp {a.level}: {a.role}</strong>
                        {a.decision ? (
                          <span className={`badge ${a.decision === 'APPROVED' ? 'bg-success' : 'bg-danger'}`}>
                            {a.decision}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">PENDING</span>
                        )}
                      </div>
                      {a.decision && (
                        <div className="small text-muted">
                          Bởi: {(a.approver as any)?.name || a.approver} <br />
                          Lúc: {formatDate(a.approvedAt)}
                          {a.comment && <div className="mt-1 fst-italic">"{a.comment}"</div>}
                        </div>
                      )}
                      {isCurrentStep && (
                        <div className="small text-primary fw-bold">
                          {canApprove ? '👉 Đang chờ bạn duyệt' : '⏳ Đang chờ duyệt'}
                        </div>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </div>

          {canApprove && (
            <div className="card shadow-sm border-primary">
              <div className="card-body">
                <label className="form-label fw-bold">Ghi chú duyệt / từ chối</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Nhập lý do hoặc ghi chú..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}