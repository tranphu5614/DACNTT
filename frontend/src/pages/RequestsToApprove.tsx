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
        setError(e?.response?.data?.message || 'Error loading list');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <h2>Requests Awaiting My Approval</h2>
      {items.length === 0 && <p>No requests found.</p>}
      {items.map((r) => (
        <div key={r._id} style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8 }}>
          <div><b>{r.title || r.typeKey}</b></div>
          <div>Requester: {r.requester}</div>
          <div>Approval Status: {r.approvalStatus}</div>
          <a href={`/requests/${r._id}`}>View Details</a>
        </div>
      ))}
    </div>
  );
}