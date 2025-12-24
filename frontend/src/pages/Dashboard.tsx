// frontend/src/pages/Dashboard.tsx
import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetDashboardStats, apiExportRequests } from '../api/requests';

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
} from 'chart.js';
import { Pie, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function Dashboard() {
  const { token, user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [chartType, setChartType] = useState<'PIE' | 'BAR' | 'DOUGHNUT'>('PIE');

  // [FIX] Sử dụng biến user để tránh lỗi TS6133 (unused variable)
  useEffect(() => {
    if (user) console.log("Dashboard loaded for user:", user.name);
  }, [user]);

  useEffect(() => {
    if (token) loadStats();
  }, [token, selectedCategory]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await apiGetDashboardStats(token!, selectedCategory);
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await apiExportRequests(token!);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Report_${selectedCategory}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert('Lỗi xuất Excel');
    }
  };

  const chartData = useMemo(() => {
    if (!stats) return null;
    const statusData = stats.statusCounts || [];
    const labels = ['NEW', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
    const dataValues = labels.map(status => {
      const found = statusData.find((x: any) => x._id === status);
      return found ? found.count : 0;
    });

    return {
      labels,
      datasets: [
        {
          label: 'Số lượng yêu cầu',
          data: dataValues,
          backgroundColor: ['#0d6efd', '#6c757d', '#ffc107', '#198754', '#dc3545'],
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [stats]);

  const urgentCount = stats?.urgentCount?.[0]?.count || 0;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold text-primary mb-0">Dashboard</h2>
          {/* Hiển thị tên user ở đây */}
          <small className="text-muted">Xin chào, <strong>{user?.name}</strong></small>
        </div>

        <div className="d-flex gap-2">
          <select 
            className="form-select" 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            style={{ width: 150 }}
          >
            <option value="ALL">Tất cả BP</option>
            <option value="IT">Chỉ IT</option>
            <option value="HR">Chỉ HR</option>
          </select>

          <select 
            className="form-select" 
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            style={{ width: 150 }}
          >
            <option value="PIE">Biểu đồ Tròn</option>
            <option value="DOUGHNUT">Vành khuyên</option>
            <option value="BAR">Biểu đồ Cột</option>
          </select>

          <button className="btn btn-success" onClick={handleExport}>
            <i className="bi bi-download me-2"></i> Xuất Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5">Đang tải dữ liệu...</div>
      ) : (
        <>
          <div className="row g-4 mb-4">
            <div className="col-md-4">
              <div className="card shadow-sm border-start border-4 border-danger">
                <div className="card-body">
                  <h6 className="text-uppercase text-muted fw-bold small">Khẩn cấp (Urgent)</h6>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="display-5 fw-bold text-danger">{urgentCount}</span>
                    <i className="bi bi-exclamation-triangle-fill fs-1 text-danger opacity-25"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-md-7">
              <div className="card shadow-sm h-100">
                <div className="card-header bg-white fw-bold">
                  Phân bố trạng thái
                </div>
                <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: 300 }}>
                  {chartData && (
                    <div style={{ width: '100%', maxWidth: chartType === 'BAR' ? '100%' : '400px' }}>
                      {chartType === 'PIE' && <Pie data={chartData} />}
                      {chartType === 'DOUGHNUT' && <Doughnut data={chartData} />}
                      {chartType === 'BAR' && <Bar data={chartData} options={{ responsive: true }} />}
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="col-md-5">
               <div className="card shadow-sm h-100">
                  <div className="card-header bg-white fw-bold">Chi tiết</div>
                  <ul className="list-group list-group-flush">
                     {stats?.statusCounts?.map((s: any) => (
                        <li key={s._id} className="list-group-item d-flex justify-content-between">
                           <span>{s._id}</span>
                           <span className="fw-bold">{s.count}</span>
                        </li>
                     ))}
                  </ul>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}