import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

function formatDate(v?: string) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString();
  } catch {
    return v;
  }
}

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [comment, setComment] = useState("");
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
      } catch (e: any) {
        setError(e?.response?.data?.message || "Không tải được yêu cầu");
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
  if (error)
    return (
      <div className="container py-4">
        <div className="alert alert-danger">{error}</div>
      </div>
    );

  const approvals = data.approvals || [];
  const approvalStatus = data.approvalStatus || "NONE";
  const currentLevel = data.currentApprovalLevel || 0;

  const myRoles = user?.roles || [];
  const isMine =
    user?._id === data.requester ||
    user?._id === (data.requester as any)?._id;

  const nextLevel = currentLevel + 1;
  const nextStep = approvals.find((a: any) => a.level === nextLevel);

  const canApprove =
    !isMine &&
    (approvalStatus === "NONE" ||
      (nextStep && myRoles.includes(nextStep.role)));

  const doAction = async (type: "approve" | "reject") => {
    if (
      !confirm(
        `Bạn chắc chắn muốn ${
          type === "approve" ? "duyệt" : "từ chối"
        } yêu cầu này?`
      )
    )
      return;

    setActionLoading(true);

    try {
      await api.patch(
        `/requests/${id}/${type}`,
        { comment },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setComment("");
      await reload();
      alert("Thành công!");
    } catch (e: any) {
      alert(e?.response?.data?.message || "Lỗi thao tác");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="d-flex justify-content-between align-items-start mb-4">
        <div>
          <h2 className="fw-bold mb-1">{data.title}</h2>
          <div className="text-muted small">
            <i className="bi bi-hash icon-label"></i> {data._id}
          </div>
        </div>

        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => navigate(-1)}
          >
            ← Quay lại
          </button>

          {canApprove && (
            <>
              <button
                className="btn btn-success"
                onClick={() => doAction("approve")}
                disabled={actionLoading}
              >
                {actionLoading ? "..." : "Duyệt"}
              </button>
              <button
                className="btn btn-outline-danger"
                onClick={() => doAction("reject")}
                disabled={actionLoading}
              >
                Từ chối
              </button>
            </>
          )}
        </div>
      </div>

      {/* Requester Info */}
      <div className="requester-box mb-4">
        <div className="requester-avatar">
          {data.requester?.name?.[0]?.toUpperCase() || "U"}
        </div>
        <div>
          <div className="fw-bold">{data.requester?.name}</div>
          <div className="text-muted small">{data.requester?.email}</div>
        </div>
      </div>

      <div className="row g-4">
        {/* LEFT – INFO */}
        <div className="col-md-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header">Thông tin chung</div>
            <div className="card-body">
              <dl className="row mb-0">
                <dt className="col-sm-4 text-muted">Loại yêu cầu</dt>
                <dd className="col-sm-8">{data.typeKey}</dd>

                <dt className="col-sm-4 text-muted">Danh mục</dt>
                <dd className="col-sm-8">
                  <span className="badge bg-secondary">{data.category}</span>
                </dd>

                <dt className="col-sm-4 text-muted">Ưu tiên</dt>
                <dd className="col-sm-8">
                  <span className="badge bg-primary">{data.priority}</span>
                </dd>

                <dt className="col-sm-4 text-muted">Ngày tạo</dt>
                <dd className="col-sm-8">{formatDate(data.createdAt)}</dd>

                <dt className="col-sm-4 text-muted">Mô tả</dt>
                <dd className="col-sm-8">{data.description || "—"}</dd>
              </dl>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header">Dữ liệu chi tiết</div>
            <div className="card-body">
              {Object.keys(data.custom || {}).length === 0 ? (
                <span className="text-muted fst-italic">
                  Không có dữ liệu bổ sung
                </span>
              ) : (
                <dl>
                  {Object.entries(data.custom).map(([k, v]) => (
                    <React.Fragment key={k}>
                      <dt className="text-muted">{k}</dt>
                      <dd>{String(v)}</dd>
                    </React.Fragment>
                  ))}
                </dl>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT – APPROVAL TIMELINE */}
        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header">Quy trình duyệt</div>
            <div className="card-body">
              <div className="timeline">
                {approvals.length === 0 && (
                  <p className="text-muted fst-italic">Không yêu cầu duyệt</p>
                )}

                {approvals.map((a: any) => {
                  const state =
                    a.decision === "APPROVED"
                      ? "approved"
                      : a.decision === "REJECTED"
                      ? "rejected"
                      : a.level === nextLevel
                      ? "current"
                      : "";

                  return (
                    <div className={`timeline-step ${state}`} key={a.level}>
                      <div className="fw-bold">
                        Cấp {a.level}: {a.role}
                      </div>

                      {a.decision ? (
                        <div className="small text-muted">
                          {a.decision} · {formatDate(a.approvedAt)}
                        </div>
                      ) : a.level === nextLevel ? (
                        <div className="small text-primary">Đang chờ duyệt</div>
                      ) : (
                        <div className="small text-muted">Chưa tới lượt</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Approval Note */}
          {canApprove && (
            <div className="card border-primary mt-3">
              <div className="card-body">
                <label className="form-label fw-bold">Ghi chú</label>
                <textarea
                  rows={3}
                  className="form-control"
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
