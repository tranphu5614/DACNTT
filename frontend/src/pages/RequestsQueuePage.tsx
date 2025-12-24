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

  // [FIX] Cập nhật lại tiêu đề để đúng với logic chung
  const title = useMemo(
    () => (category === 'HR' ? 'Hàng chờ Nhân sự' : category === 'IT' ? 'Hàng chờ IT' : `Hàng chờ ${category}`),
    [category],
  );

  const load = async () => {
    setLoading(true);
    try {
      const res = await apiQueueRequests(token!, {
        category, // category giờ là string, backend sẽ tự filter
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
          <label className="form-label">Trạng thái</label>
          <select
            className="form-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="NEW">Mới (NEW)</option>
            <option value="PENDING">Chờ xử lý (PENDING)</option>
            <option value="IN_PROGRESS">Đang xử lý</option>
            <option value="COMPLETED">Hoàn thành</option>
            <option value="CANCELLED">Đã hủy</option>
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
              <th>Tiêu đề</th>
              <th>Loại</th>
              <th>Ưu tiên</th>
              <th>Trạng thái</th>
              <th>Người tạo</th>
              <th>Ngày tạo</th>
              <th className="text-end">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="text-center py-4 text-muted">
                  Không có dữ liệu
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r._id}>
                <td>
                  <Link to={`/requests/${r._id}`} className="fw-semibold text-decoration-none">
                    {r.title || <span className="fst-italic text-muted">(Không tiêu đề)</span>}
                  </Link>
                  <div className="small text-muted" style={{fontSize: '0.75rem'}}>Mã: {r._id}</div>
                </td>
                <td><span className="badge bg-light text-dark border">{r.typeKey}</span></td>
                <td>
                  <span className={`badge ${r.priority === 'URGENT' ? 'bg-danger' : r.priority === 'HIGH' ? 'bg-warning text-dark' : 'bg-info text-dark'}`}>
                    {r.priority || '-'}
                  </span>
                </td>
                <td>
                  <span className={`badge ${r.status === 'COMPLETED' ? 'bg-success' : 'bg-secondary'}`}>
                    {r.status}
                  </span>
                </td>
                <td className="text-truncate" style={{ maxWidth: 160 }}>
                  {/* [FIXED] Hiển thị tên thay vì [object Object] */}
                  {(r.requester as any)?.name || (r.requester as any)?.email || 'Unknown'}
                </td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}</td>
                <td className="text-end">
                  <Link to={`/requests/${r._id}`} className="btn btn-sm btn-outline-primary">
                    Chi tiết
                  </Link>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={7} className="text-center py-3">Đang tải dữ liệu...</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > limit && (
        <nav aria-label="pagination" className="d-flex justify-content-end mt-3">
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
                Trang {page}/{Math.max(1, Math.ceil(total / limit))}
                </span>
            </li>
            <li className={`page-item ${page * limit >= total ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage((p) => p + 1)}>
                Next ›
                </button>
            </li>
            </ul>
        </nav>
      )}
    </>
  );
}