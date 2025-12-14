import React, { useEffect, useMemo, useState } from 'react';
import { apiMyRequests, MyRequestItem } from '../api/requests';
import { useAuth } from '../context/AuthContext';

function formatDate(s: string) {
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

export default function MyRequestsPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<MyRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const canLoad = useMemo(() => Boolean(token), [token]);

  useEffect(() => {
    let aborted = false;

    async function load() {
      if (!canLoad) return;
      setLoading(true);
      setError(null);

      try {
        const res = await apiMyRequests(token!, { page, limit });
        if (aborted) return;

        setRows(res.items);
        setTotal(res.total);
      } catch (e: any) {
        if (aborted) return;
        console.error(e);

        setRows([]);
        setTotal(0);
        setError(e?.message ?? 'Đã có lỗi xảy ra khi tải dữ liệu');
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    load();
    return () => {
      aborted = true;
    };
  }, [canLoad, token, page, limit, refreshKey]);

  const handleReload = () => {
    setPage(1);
    setRefreshKey((k) => k + 1);
  };

  if (!token) {
    return (
      <div className="page">
        <h3>Yêu cầu của tôi</h3>
        <div className="alert alert-warning mt-3">
          Vui lòng đăng nhập để xem yêu cầu của bạn.
        </div>
      </div>
    );
  }

  return (
    <div className="page">

      {/* HEADER */}
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h3 className="fw-bold mb-1">Yêu cầu của tôi</h3>
          <p className="text-muted small m-0">
            Danh sách yêu cầu bạn đã gửi vào hệ thống
          </p>
        </div>

        {/* Tổng + Reload */}
        <div className="d-flex align-items-center gap-2">
          <span className="text-muted">
            Tổng: <strong>{total}</strong>
          </span>

          <button
            className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1"
            disabled={loading}
            onClick={handleReload}
          >
            <i className="bi bi-arrow-clockwise"></i>
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {/* ERROR */}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* NO DATA */}
      {!loading && rows.length === 0 && !error && (
        <div className="alert alert-info">
          Chưa có yêu cầu nào. Hãy tạo yêu cầu mới.
        </div>
      )}

      {/* TABLE */}
      <div className="table-responsive shadow-sm rounded">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Duyệt</th>
              <th>Tạo lúc</th>
              <th>Cập nhật</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                
                {/* Tiêu đề */}
                <td>
                  <a
                    href={`/requests/${r._id}`}
                    className="fw-semibold text-decoration-none"
                  >
                    {r.title || '(Không tiêu đề)'}
                  </a>
                </td>

                <td>{r.category}</td>

                {/* Priority */}
                <td>
                  {r.priority ? (
                    <span
                      className={
                        'badge px-2 py-1 ' +
                        (r.priority === 'URGENT'
                          ? 'text-bg-danger'
                          : r.priority === 'HIGH'
                          ? 'text-bg-warning'
                          : 'text-bg-info')
                      }
                      style={{ borderRadius: 10 }}
                    >
                      {r.priority}
                    </span>
                  ) : (
                    '-'
                  )}
                </td>

                {/* Status */}
                <td>
                  <span className="badge text-bg-secondary px-2 py-1" style={{ borderRadius: 10 }}>
                    {r.status}
                  </span>
                </td>

                {/* Approval */}
                <td>
                  <span
                    className={
                      'badge px-2 py-1 ' +
                      (r.approvalStatus === 'APPROVED'
                        ? 'text-bg-success'
                        : r.approvalStatus === 'REJECTED'
                        ? 'text-bg-danger'
                        : 'text-bg-light text-dark border')
                    }
                    style={{ borderRadius: 10 }}
                  >
                    {r.approvalStatus ?? 'NONE'}
                  </span>
                </td>

                {/* Dates */}
                <td className="small text-muted">{formatDate(r.createdAt)}</td>
                <td className="small text-muted">{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      {total > limit && (
        <div className="d-flex gap-2 mt-3 justify-content-end align-items-center">
          <button
            className="btn btn-outline-primary btn-sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            « Trước
          </button>

          <span className="text-muted small">Trang {page}</span>

          <button
            className="btn btn-outline-primary btn-sm"
            disabled={page * limit >= total || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau »
          </button>
        </div>
      )}
    </div>
  );
}
