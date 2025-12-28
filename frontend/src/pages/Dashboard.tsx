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
      alert('Error exporting data. Please try again later.');
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

  // --- CHART CONFIG ---
  const chartConfig = useMemo(() => {
    if (!stats) return null;
    const statusData = stats.statusCounts || [];
    
    const statusMap: Record<string, { label: string, color: string }> = {
        'NEW': { label: 'New', color: '#6c757d' }, 
        'PENDING': { label: 'Pending Approval', color: '#ffc107' }, 
        'IN_PROGRESS': { label: 'In Progress', color: '#0d6efd' }, 
        'COMPLETED': { label: 'Completed', color: '#198754' }, 
        'CANCELLED': { label: 'Cancelled', color: '#dc3545' } 
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
          label: 'Count',
          data: dataValues,
          backgroundColor: labels.map(k => statusMap[k].color),
          borderColor: '#ffffff',
          borderWidth: 2,
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' as const },
            title: { display: false }
        }
      }
    };
  }, [stats]);

  // --- COMPONENT: KPI CARD (Flat Design) ---
  const KpiCard = ({ title, value, icon, color, subtext }: any) => (
      <div className="col-md-6 col-lg-3">
          {/* Using border instead of shadow for flat look */}
          <div className="card border h-100 rounded-3 bg-white"> 
              <div className="card-body d-flex align-items-center p-3">
                  <div className={`rounded-circle p-3 me-3 bg-${color}-subtle text-${color} d-flex align-items-center justify-content-center`} style={{width: 52, height: 52}}>
                      <i className={`bi ${icon} fs-4`}></i>
                  </div>
                  <div className="overflow-hidden">
                      <div className="text-muted small text-uppercase fw-bold text-truncate" style={{fontSize: '0.7rem', letterSpacing: '0.5px'}}>{title}</div>
                      <div className="h3 mb-0 fw-bold text-dark">{value}</div>
                      {subtext && <small className="text-secondary text-truncate d-block" style={{fontSize: '0.75rem'}}>{subtext}</small>}
                  </div>
              </div>
          </div>
      </div>
  );

  return (
    <div className="d-flex flex-column h-100 bg-white">
      
      {/* 1. HEADER (CONTROL PANEL) - Sticky & Full Width */}
      <div className="border-bottom px-4 py-2 d-flex justify-content-between align-items-center bg-white sticky-top" style={{zIndex: 100, height: 56}}>
        
        {/* Left: Title */}
        <div className="d-flex align-items-center gap-3">
           <h6 className="fw-bold text-dark m-0">OVERVIEW</h6>
           <div className="vr h-50"></div>
           <span className="text-muted small">Hello, <strong>{user?.name}</strong></span>
        </div>

        {/* Right: Tools */}
        <div className="d-flex gap-2 align-items-center">
            
            {/* Filter Category */}
            <select 
                className="form-select form-select-sm bg-light border-0 fw-500" 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{maxWidth: 130, cursor: 'pointer'}}
            >
                <option value="ALL">All Categories</option>
                <option value="IT">IT Support</option>
                <option value="HR">Human Resources</option>
            </select>

            <div className="vr h-50 mx-1"></div>

            {/* Chart Type Toggle */}
            <div className="btn-group btn-group-sm bg-light rounded p-0" role="group">
                <button 
                    className={`btn btn-sm border-0 rounded ${chartType === 'DOUGHNUT' ? 'bg-white shadow-sm text-primary' : 'text-muted'}`} 
                    onClick={() => setChartType('DOUGHNUT')} title="Pie Chart"
                >
                    <i className="bi bi-pie-chart-fill"></i>
                </button>
                <button 
                    className={`btn btn-sm border-0 rounded ${chartType === 'BAR' ? 'bg-white shadow-sm text-primary' : 'text-muted'}`} 
                    onClick={() => setChartType('BAR')} title="Bar Chart"
                >
                    <i className="bi bi-bar-chart-fill"></i>
                </button>
            </div>

            <button className="btn btn-sm btn-success fw-bold ms-2 shadow-sm" onClick={handleExport}>
                <i className="bi bi-file-earmark-arrow-down me-1"></i> Export
            </button>
        </div>
      </div>

      {/* 2. MAIN CONTENT - Full White Canvas */}
      <div className="flex-grow-1 overflow-y-auto">
        
        {/* Container fluid, moderate padding, full white background */}
        <div className="container-fluid p-4" style={{maxWidth: 1600}}>
            
            {/* KPI ROW */}
            <div className="row g-3 mb-4">
                <KpiCard 
                    title="Total Requests" 
                    value={kpiData.total} 
                    icon="bi-layers-fill" 
                    color="primary" 
                    subtext="All time"
                />
                <KpiCard 
                    title="Pending Action" 
                    value={kpiData.pending} 
                    icon="bi-hourglass-split" 
                    color="warning" 
                    subtext="Awaiting approval"
                />
                <KpiCard 
                    title="In Progress" 
                    value={kpiData.progress} 
                    icon="bi-gear-wide-connected" 
                    color="info" 
                    subtext="Work progress"
                />
                <KpiCard 
                    title="Urgent" 
                    value={kpiData.urgent} 
                    icon="bi-exclamation-triangle-fill" 
                    color="danger" 
                    subtext="High priority"
                />
            </div>

            {/* CHARTS & TABLE ROW */}
            <div className="row g-4">
                
                {/* Left: Chart */}
                <div className="col-lg-7 col-xl-8">
                    {/* Using border instead of shadow */}
                    <div className="card border h-100 rounded-3">
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="fw-bold text-dark m-0 small text-uppercase"><i className="bi bi-pie-chart me-2 text-primary"></i>Status Analysis</h6>
                        </div>
                        <div className="card-body" style={{height: 400}}>
                            {loading ? (
                                <div className="d-flex align-items-center justify-content-center h-100">
                                    <div className="spinner-border text-primary" role="status"></div>
                                </div>
                            ) : chartConfig ? (
                                <div className="h-100 w-100 d-flex justify-content-center align-items-center">
                                    {chartType === 'DOUGHNUT' && <Doughnut data={chartConfig.data} options={chartConfig.options} />}
                                    {chartType === 'BAR' && <Bar data={chartConfig.data} options={chartConfig.options} />}
                                    {chartType === 'PIE' && <Pie data={chartConfig.data} options={chartConfig.options} />}
                                </div>
                            ) : (
                                <div className="d-flex align-items-center justify-content-center h-100 text-muted">No data available</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right: Detailed Table */}
                <div className="col-lg-5 col-xl-4">
                    <div className="card border h-100 rounded-3">
                        <div className="card-header bg-white border-bottom py-3">
                            <h6 className="fw-bold text-dark m-0 small text-uppercase"><i className="bi bi-table me-2 text-success"></i>Data Details</h6>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="bg-light border-bottom">
                                        <tr>
                                            <th className="ps-4 small text-muted text-uppercase fw-bold py-3">Status</th>
                                            <th className="text-end small text-muted text-uppercase fw-bold py-3">Qty</th>
                                            <th className="text-end pe-4 small text-muted text-uppercase fw-bold py-3">%</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.statusCounts?.map((s: any) => {
                                            const percent = kpiData.total > 0 ? ((s.count / kpiData.total) * 100).toFixed(1) : 0;
                                            return (
                                                <tr key={s._id}>
                                                    <td className="ps-4 fw-500 small">
                                                        <span className={`badge me-2 rounded-pill border`} 
                                                              style={{
                                                                  width: 10, height: 10, padding: 0, display: 'inline-block',
                                                                  backgroundColor: s._id === 'COMPLETED' ? '#198754' : s._id === 'PENDING' ? '#ffc107' : '#6c757d',
                                                                  borderColor: 'rgba(0,0,0,0.1)'
                                                              }}> 
                                                        </span>
                                                        {s._id}
                                                    </td>
                                                    <td className="text-end fw-bold small">{s.count}</td>
                                                    <td className="text-end pe-4 text-muted small">{percent}%</td>
                                                </tr>
                                            )
                                        })}
                                        {(!stats?.statusCounts || stats.statusCounts.length === 0) && (
                                            <tr><td colSpan={3} className="text-center py-5 text-muted small">No data available</td></tr>
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
    </div>
  );
}