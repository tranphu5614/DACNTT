import { useEffect, useMemo, useState } from 'react';
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
  
  // --- FIX: Thêm state này để buộc reload khi cần ---
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
    // Thêm refreshKey vào dependency array để kích hoạt lại useEffect khi nó thay đổi
  }, [canLoad, token, page, limit, refreshKey]);

  // --- FIX: Hàm xử lý nút Tải lại ---
  const handleReload = () => {
    setPage(1); // Đưa về trang đầu
    setRefreshKey((prev) => prev + 1); // Thay đổi key để buộc useEffect chạy lại
  };

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
            onClick={handleReload} // 👈 Sử dụng hàm handleReload mới
            title="Tải lại dữ liệu mới nhất từ server"
          >
            {loading ? 'Đang tải...' : '↻ Tải lại'}
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
                <td>
                  <a href={`/requests/${r._id}`} className="text-decoration-none fw-semibold">
                    {r.title || '(Không tiêu đề)'}
                  </a>
                </td>
                <td>{r.category}</td>
                <td>
                  {r.priority ? <span className={`badge ${r.priority === 'URGENT' ? 'text-bg-danger' : r.priority === 'HIGH' ? 'text-bg-warning' : 'text-bg-info'}`}>{r.priority}</span> : '-'}
                </td>
                <td><span className="badge text-bg-secondary">{r.status}</span></td>
                <td>
                  <span
                    className={
                      'badge ' +
                      (r.approvalStatus === 'APPROVED'
                        ? 'text-bg-success'
                        : r.approvalStatus === 'REJECTED'
                        ? 'text-bg-danger'
                        : 'text-bg-light text-dark border')
                    }
                  >
                    {r.approvalStatus ?? 'NONE'}
                  </span>
                </td>
                <td className="small text-muted">{formatDate(r.createdAt)}</td>
                <td className="small text-muted">{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {total > limit && (
        <div className="d-flex gap-2 mt-3 justify-content-end">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            « Trước
          </button>
          <span className="align-self-center px-2">Trang {page}</span>
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