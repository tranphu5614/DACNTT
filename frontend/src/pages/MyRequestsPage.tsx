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
  const [limit] = useState(20);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [canLoad, token, page, limit]);

  if (!token) {
    return (
      <div className="container py-4">
        <h3>Yêu cầu của tôi</h3>
        <div className="alert alert-warning mt-3">
          Vui lòng đăng nhập để xem yêu cầu của bạn.
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="m-0">Yêu cầu của tôi</h3>
        <div>
          <span className="me-2">Tổng: <strong>{total}</strong></span>
          <button
            className="btn btn-outline-secondary btn-sm"
            disabled={loading}
            onClick={() => setPage(1)}
            title="Tải lại"
          >
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {!loading && rows.length === 0 && !error && (
        <div className="alert alert-info">
          Chưa có yêu cầu nào. Hãy tạo yêu cầu mới.
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-sm table-hover align-middle">
          <thead>
            <tr>
              <th>Tiêu đề</th>
              <th>Danh mục</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Tạo lúc</th>
              <th>Cập nhật</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r._id}>
                <td>{r.title}</td>
                <td>{r.category}</td>
                <td>{r.priority ?? '-'}</td>
                <td>{r.status}</td>
                <td>{formatDate(r.createdAt)}</td>
                <td>{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            « Trước
          </button>
          <span className="align-self-center">Trang {page}</span>
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * limit >= total || loading}
          >
            Sau »
          </button>
        </div>
      )}
    </div>
  );
}
