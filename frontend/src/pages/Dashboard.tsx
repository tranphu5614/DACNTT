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
  
  // Data State
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Filter State
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [chartType, setChartType] = useState<'PIE' | 'BAR' | 'DOUGHNUT'>('DOUGHNUT');

  // Load Data
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

  useEffect(() => { if (token) loadStats(); }, [token, selectedCategory]);

  // Export Excel
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
      alert('Lỗi xuất dữ liệu. Vui lòng thử lại sau.');
    }
  };

  // --- KPI CALCULATION ---
  const kpiData = useMemo(() => {
      const s = stats?.statusCounts || [];
      const getCount = (status: string) => s.find((x: any) => x._id === status)?.count || 0;

      const pending = getCount('PENDING') + getCount('WAITING_APPROVAL'); 
      const progress = getCount('IN_PROGRESS');
      const urgent = stats?.urgentCount?.[0]?.count || 0;
      const total = s.reduce((acc: number, cur: any) => acc + cur.count, 0);

      return { total, pending, progress, urgent };
  }, [stats]);

  // --- CHART DATA ---
  const chartConfig = useMemo(() => {
    if (!stats) return null;
    const statusData = stats.statusCounts || [];
    
    // Định nghĩa màu sắc chuẩn Odoo/Bootstrap
    const statusMap: Record<string, { label: string, color: string }> = {
        'NEW': { label: 'Mới', color: '#6c757d' }, // Secondary
        'PENDING': { label: 'Chờ duyệt', color: '#ffc107' }, // Warning
        'IN_PROGRESS': { label: 'Đang xử lý', color: '#0d6efd' }, // Primary
        'COMPLETED': { label: 'Hoàn thành', color: '#198754' }, // Success
        'CANCELLED': { label: 'Đã hủy', color: '#dc3545' } // Danger
    };

    const labels = Object.keys(statusMap);
    const dataValues = labels.map(key => {
        const found = statusData.find((x: any) => x._id === key);
        return found ? found.count : 0;
    });

    return {
      data: {
        labels: labels.map(k => statusMap[k].label),
        datasets: [{
          label: 'Số lượng',
          data: dataValues,
          backgroundColor: labels.map(k => statusMap[k].color),
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        plugins: {
            legend: { position: 'bottom' as const },
            title: { display: false }
        }
      }
    };
  }, [stats]);

  // --- RENDER KPI CARD COMPONENT ---
  const KpiCard = ({ title, value, icon, color, subtext }: any) => (
      <div className="col-md-3 col-sm-6">
          <div className="card shadow-sm border-0 h-100">
              <div className="card-body d-flex align-items-center">
                  <div className={`rounded-circle p-3 me-3 bg-${color}-subtle text-${color}`}>
                      <i className={`bi ${icon} fs-4`}></i>
                  </div>
                  <div>
                      <div className="text-muted small text-uppercase fw-bold">{title}</div>
                      <div className="h3 mb-0 fw-bold text-dark">{value}</div>
                      {subtext && <small className="text-muted" style={{fontSize: '0.7rem'}}>{subtext}</small>}
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* 1. CONTROL PANEL */}
      <div className="o_control_panel bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 99, height: 60}}>
        <div>
           <nav aria-label="breadcrumb">
            <ol className="breadcrumb mb-0 small">
              <li className="breadcrumb-item text-muted">Hệ thống</li>
              <li className="breadcrumb-item active fw-bold text-primary">Tổng quan (Dashboard)</li>
            </ol>
          </nav>
        </div>

        <div className="d-flex gap-2 align-items-center">
            {/* Filter Category */}
            <div className="input-group input-group-sm">
                <span className="input-group-text bg-light text-muted">Phòng ban</span>
                <select 
                    className="form-select" 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{maxWidth: 120}}
                >
                    <option value="ALL">Tất cả</option>
                    <option value="IT">IT Support</option>
                    <option value="HR">Nhân sự</option>
                </select>
            </div>

            {/* Filter Chart Type */}
            <div className="btn-group btn-group-sm" role="group">
                <button 
                    className={`btn ${chartType === 'DOUGHNUT' ? 'btn-secondary' : 'btn-outline-secondary'}`} 
                    onClick={() => setChartType('DOUGHNUT')} title="Biểu đồ tròn"
                >
                    <i className="bi bi-pie-chart-fill"></i>
                </button>
                <button 
                    className={`btn ${chartType === 'BAR' ? 'btn-secondary' : 'btn-outline-secondary'}`} 
                    onClick={() => setChartType('BAR')} title="Biểu đồ cột"
                >
                    <i className="bi bi-bar-chart-fill"></i>
                </button>
            </div>

            <div className="vr mx-1"></div>

            <button className="btn btn-sm btn-success" onClick={handleExport}>
                <i className="bi bi-file-earmark-spreadsheet me-2"></i> Xuất Báo cáo
            </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT */}
      <div className="flex-grow-1 p-4 overflow-y-auto">
        
        {/* Header Greeting */}
        <div className="mb-4">
            <h4 className="fw-bold text-dark mb-1">Xin chào, {user?.name} 👋</h4>
            <p className="text-muted small">Dưới đây là tình hình hoạt động của hệ thống {selectedCategory === 'ALL' ? '' : selectedCategory}.</p>
        </div>

        {/* KPI CARDS */}
        <div className="row g-4 mb-4">
            <KpiCard 
                title="Tổng yêu cầu" 
                value={kpiData.total} 
                icon="bi-layers-fill" 
                color="primary" 
                subtext="Tất cả thời gian"
            />
            <KpiCard 
                title="Chờ phê duyệt" 
                value={kpiData.pending} 
                icon="bi-hourglass-split" 
                color="warning" 
                subtext="Cần xử lý ngay"
            />
            <KpiCard 
                title="Đang thực hiện" 
                value={kpiData.progress} 
                icon="bi-gear-wide-connected" 
                color="info" 
                subtext="Đang được giải quyết"
            />
            <KpiCard 
                title="Khẩn cấp" 
                value={kpiData.urgent} 
                icon="bi-exclamation-triangle-fill" 
                color="danger" 
                subtext="Mức độ ưu tiên cao"
            />
        </div>

        {/* CHARTS & DETAILS */}
        <div className="row g-4">
            {/* Left: Chart */}
            <div className="col-lg-7">
                <div className="card shadow-sm border-0 h-100">
                    <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                        <h6 className="fw-bold text-dark m-0">Phân bố trạng thái</h6>
                    </div>
                    <div className="card-body d-flex align-items-center justify-content-center" style={{minHeight: 350}}>
                        {loading ? (
                            <div className="spinner-border text-primary" role="status"></div>
                        ) : chartConfig ? (
                            <div style={{ width: '100%', maxWidth: chartType === 'BAR' ? '100%' : '320px' }}>
                                {chartType === 'DOUGHNUT' && <Doughnut data={chartConfig.data} options={chartConfig.options} />}
                                {chartType === 'BAR' && <Bar data={chartConfig.data} options={chartConfig.options} />}
                                {chartType === 'PIE' && <Pie data={chartConfig.data} options={chartConfig.options} />}
                            </div>
                        ) : (
                            <div className="text-muted">Chưa có dữ liệu</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Data Table */}
            <div className="col-lg-5">
                <div className="card shadow-sm border-0 h-100">
                    <div className="card-header bg-white border-bottom-0 pt-3 pb-0">
                        <h6 className="fw-bold text-dark m-0">Chi tiết số liệu</h6>
                    </div>
                    <div className="card-body p-0 pt-2">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 small text-muted text-uppercase">Trạng thái</th>
                                        <th className="text-end pe-4 small text-muted text-uppercase">Số lượng</th>
                                        <th className="text-end pe-4 small text-muted text-uppercase">Tỷ lệ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {/* [FIX] Removed unused 'idx' parameter */}
                                    {stats?.statusCounts?.map((s: any) => {
                                        const percent = kpiData.total > 0 ? ((s.count / kpiData.total) * 100).toFixed(1) : 0;
                                        return (
                                            <tr key={s._id}>
                                                <td className="ps-4 fw-500">
                                                    <span className={`badge me-2 bg-secondary rounded-pill`} style={{width: 8, height: 8, padding: 0, display: 'inline-block'}}> </span>
                                                    {s._id}
                                                </td>
                                                <td className="text-end pe-4 fw-bold">{s.count}</td>
                                                <td className="text-end pe-4 text-muted small">{percent}%</td>
                                            </tr>
                                        )
                                    })}
                                    {(!stats?.statusCounts || stats.statusCounts.length === 0) && (
                                        <tr><td colSpan={3} className="text-center py-4 text-muted">Không có dữ liệu</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}