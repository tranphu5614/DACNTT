import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiQueueRequests } from '../api/requests';

export default function RequestsQueuePage({ category }: { category: 'HR' | 'IT' }) {
  const { token } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [status, setStatus] = useState(''); // vẫn gửi lên để filter nếu BE dùng
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);

  const title = useMemo(
    () => (category === 'HR' ? 'Hàng chờ Nhân sự' : 'Hàng chờ IT'),
    [category],
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiQueueRequests(token!, {
        category,
        page,
        limit,
        status,
        priority,
        q,
      });
      setRows(res.items);
      setTotal(res.total);
    } catch (e: any) {
      alert(e?.message || 'Load failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, category]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const onFilter = async (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    await load();
  };

  return (
    <>
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h4 className="mb-0">{title}</h4>
      </div>

      <form className="row g-2 align-items-end mb-3" onSubmit={onFilter}>
        <div className="col-sm-4">
          <label className="form-label">Tìm kiếm</label>
          <input
            className="form-control"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tiêu đề/mô tả..."
          />
        </div>
        <div className="col-sm-3 col-6">
          <label className="form-label">Trạng thái (BE)</label>
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="OPEN">OPEN</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="CLOSED">CLOSED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
        </div>
        <div className="col-sm-3 col-6">
          <label className="form-label">Ưu tiên</label>
          <select
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="URGENT">URGENT</option>
          </select>
        </div>
        <div className="col-sm-2 col-12 d-grid">
          <button className="btn btn-outline-primary" type="submit" disabled={loading}>
            Lọc
          </button>
        </div>
      </form>

      <div className="table-responsive">
        <table className="table table-hover align-middle">
          <thead className="table-light">
            <tr>
              <th>Mã</th>
              <th>Tiêu đề</th>
              <th>Loại</th>
              <th>Ưu tiên</th>
              <th>Trạng thái duyệt</th>
              <th>Người tạo</th>
              <th>Ngày tạo</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="text-center">
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="text-secondary">{r._id}</td>
                <td>
                  <Link to={`/requests/${r._id}`}>{r.title || r.typeKey || r._id}</Link>
                </td>
                <td>{r.typeKey}</td>
                <td>
                  <span className="badge text-bg-info">{r.priority || '-'}</span>
                </td>
                <td>
                  <span
                    className={
                      'badge ' +
                      (r.approvalStatus === 'APPROVED'
                        ? 'text-bg-success'
                        : r.approvalStatus === 'REJECTED'
                        ? 'text-bg-danger'
                        : 'text-bg-secondary')
                    }
                  >
                    {r.approvalStatus || 'NONE'}
                  </span>
                </td>
                <td className="text-truncate" style={{ maxWidth: 160 }}>
                  {String(r.requester)}
                </td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                <td>
                  <Link to={`/requests/${r._id}`} className="btn btn-sm btn-outline-primary">
                    Xem
                  </Link>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={8}>Đang tải...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <nav aria-label="pagination">
        <ul className="pagination">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button
              className="page-link"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹ Prev
            </button>
          </li>
          <li className="page-item disabled">
            <span className="page-link">
              Page {page}/{Math.max(1, Math.ceil(total / limit))} — {total} requests
            </span>
          </li>
          <li className={`page-item ${page * limit >= total ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => setPage((p) => p + 1)}>
              Next ›
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
