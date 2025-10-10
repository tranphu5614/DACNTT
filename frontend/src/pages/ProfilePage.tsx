import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function ProfilePage() {
  const { token, refreshMe } = useAuth();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setErr('');
      try {
        await refreshMe();
      } catch (e: any) {
        setErr(e.message || 'Load profile failed');
      } finally {
        setLoading(false);
      }
    };
    if (token) run();
  }, [token, refreshMe]);

  return (
    <div className="page">
      <h1>Profile</h1>
      {loading ? <p>Loading...</p> : err ? <div className="error">{err}</div> : (
        <p>Dữ liệu đã đồng bộ từ <code>/users/me</code>.</p>
      )}
    </div>
  );
}
