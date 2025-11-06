import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

function formatDate(v?: string) {
  if (!v) return '—';
  return new Date(v).toLocaleString();
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await api.get(`/requests/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
        setError(null);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Không tải được yêu cầu');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  const reload = async () => {
    const res = await api.get(`/requests/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setData(res.data);
  };

  if (!token) return <div className="container py-4">Cần đăng nhập.</div>;
  if (loading) return <div className="container py-4">Đang tải...</div>;
  if (error) {
    return (
      <div className="container py-4">
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>{error}</span>
          <button className="btn btn-sm btn-outline-light" onClick={() => navigate(-1)}>
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

  const canApprove = canApproveNormal || canApproveForce;

  const doAction = async (type: 'approve' | 'reject') => {
    setActionLoading(true);
    try {
      await api.patch(
        `/requests/${id}/${type}`,
        { comment },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setComment('');
      await reload();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Thao tác thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const renderCustom = () => {
    const c = data.custom || {};
    if (data.typeKey === 'meeting_room_booking') {
      return (
        <dl className="row mb-0">
          <dt className="col-5 text-muted" style={{ fontSize: 13 }}>
            Loại phòng
          </dt>
          <dd className="col-7" style={{ fontSize: 13 }}>
            {c.size || '—'}
          </dd>
          <dt className="col-5 text-muted" style={{ fontSize: 13 }}>
            Bắt đầu
          </dt>
          <dd className="col-7" style={{ fontSize: 13 }}>
            {c.start ? new Date(c.start).toLocaleString() : '—'}
          </dd>
          <dt className="col-5 text-muted" style={{ fontSize: 13 }}>
            Kết thúc
          </dt>
          <dd className="col-7" style={{ fontSize: 13 }}>
            {c.end ? new Date(c.end).toLocaleString() : '—'}
          </dd>
          <dt className="col-5 text-muted" style={{ fontSize: 13 }}>
            Phòng
          </dt>
          <dd className="col-7" style={{ fontSize: 13 }}>
            {c.roomKey || '—'}
          </dd>
        </dl>
      );
    }
    const keys = Object.keys(c);
    if (!keys.length) return <p className="mb-0 text-muted">Không có</p>;
    return (
      <dl className="row mb-0">
        {keys.map((k) => (
          <React.Fragment key={k}>
            <dt className="col-5 text-muted" style={{ fontSize: 13 }}>
              {k}
            </dt>
            <dd className="col-7" style={{ fontSize: 13 }}>
              {typeof c[k] === 'string' || typeof c[k] === 'number'
                ? String(c[k])
                : Array.isArray(c[k])
                ? c[k].join(', ')
                : JSON.stringify(c[k])}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    );
  };

  return (
    <div className="container py-4" style={{ maxWidth: 900 }}>
      {/* header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h3 className="mb-0">Yêu cầu: {data.title || data.typeKey}</h3>
          <small className="text-muted">ID: {data._id}</small>
        </div>
        <div className="d-flex gap-2">
          <Link to={-1 as any} className="btn btn-outline-secondary btn-sm">
            ← Quay lại
          </Link>
          {canApprove && (
            <>
              <button
                className="btn btn-success btn-sm"
                onClick={() => doAction('approve')}
                disabled={actionLoading}
              >
                ✅ Duyệt
              </button>
              <button
                className="btn btn-outline-danger btn-sm"
                onClick={() => doAction('reject')}
                disabled={actionLoading}
              >
                ❌ Từ chối
              </button>
            </>
          )}
        </div>
      </div>

      {/* top cards */}
      <div className="row g-3 mb-3">
        {/* info */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="text-uppercase text-muted mb-2">THÔNG TIN</h6>
              <p className="mb-1">
                <strong>Loại:</strong> {data.typeKey}
              </p>
              <p className="mb-1">
                <strong>Danh mục:</strong> {data.category}
              </p>
              <p className="mb-1">
                <strong>Ưu tiên:</strong>{' '}
                <span className="badge text-bg-info">{data.priority || '—'}</span>
              </p>
              <p className="mb-1">
                <strong>Trạng thái duyệt:</strong>{' '}
                <span
                  className={
                    'badge ' +
                    (approvalStatus === 'APPROVED'
                      ? 'text-bg-success'
                      : approvalStatus === 'REJECTED'
                      ? 'text-bg-danger'
                      : 'text-bg-secondary')
                  }
                >
                  {approvalStatus}
                </span>
              </p>
              <p className="mb-0">
                <strong>Trạng thái:</strong>{' '}
                <span className="badge text-bg-secondary">{data.status}</span>
              </p>
            </div>
          </div>
        </div>

        {/* content */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="text-uppercase text-muted mb-2">NỘI DUNG</h6>
              <p className="mb-1">
                <strong>Tiêu đề:</strong> {data.title || '—'}
              </p>
              <p className="mb-1">
                <strong>Mô tả:</strong> {data.description || '—'}
              </p>
              <p className="mb-1">
                <strong>Tạo lúc:</strong> {formatDate(data.createdAt)}
              </p>
              <p className="mb-0">
                <strong>Cập nhật:</strong> {formatDate(data.updatedAt)}
              </p>
            </div>
          </div>
        </div>

        {/* custom */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-body">
              <h6 className="text-uppercase text-muted mb-2">DỮ LIỆU GỬI LÊN</h6>
              {renderCustom()}
            </div>
          </div>
        </div>
      </div>

      {/* approval timeline */}
      <div className="card mb-3">
        <div className="card-body">
          <h6 className="text-uppercase text-muted mb-3">QUY TRÌNH DUYỆT</h6>
          {approvals.length === 0 && (
            <p className="mb-0 text-muted">Yêu cầu này không cần duyệt.</p>
          )}
          {approvals.length > 0 && (
            <ul className="list-group list-group-flush">
              {approvals.map((a: any) => {
                const isCurrent = a.level === nextLevel && !a.decision;
                return (
                  <li key={a.level} className="list-group-item d-flex justify-content-between">
                    <div>
                      <div>
                        <strong>Cấp {a.level}</strong> – {a.role}
                        {isCurrent && <span className="badge bg-warning ms-2">Đang chờ bạn</span>}
                      </div>
                      {a.decision && (
                        <div className="small text-muted">
                          {a.decision} bởi {a.approver} lúc {formatDate(a.approvedAt)}
                          {a.comment ? ` – "${a.comment}"` : ''}
                        </div>
                      )}
                    </div>
                    <div>
                      {a.decision ? (
                        <span
                          className={'badge ' + (a.decision === 'APPROVED' ? 'bg-success' : 'bg-danger')}
                        >
                          {a.decision}
                        </span>
                      ) : (
                        <span className="badge bg-secondary">PENDING</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* action box (chỉ nhập note) */}
      {canApprove && (
        <div className="card">
          <div className="card-body">
            <h6 className="text-uppercase text-muted mb-2">Ghi chú</h6>
            <textarea
              className="form-control mb-2"
              rows={3}
              placeholder="Nhập ghi chú khi duyệt / từ chối"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            {/* không có nút ở đây */}
          </div>
        </div>
      )}
    </div>
  );
}
