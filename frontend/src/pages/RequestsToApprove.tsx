// frontend/src/pages/RequestsToApprove.tsx
import { useEffect, useState } from 'react';
import api from '../utils/api';

export default function RequestsToApprove() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/requests/pending-approval');
        const data = res.data;
        setItems(Array.isArray(data) ? data : []);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Lỗi tải danh sách');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2>Yêu cầu chờ tôi duyệt</h2>
      {items.length === 0 && <p>Không có yêu cầu nào.</p>}
      {items.map((r) => (
        <div key={r._id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
          <div><b>{r.title || r.typeKey}</b></div>
          <div>Người gửi: {r.requester}</div>
          <div>Trạng thái duyệt: {r.approvalStatus}</div>
          <a href={`/requests/${r._id}`}>Xem chi tiết</a>
        </div>
      ))}
    </div>
  );
}
