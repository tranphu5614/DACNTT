import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGetAssignedRequests, MyRequestItem } from '../api/requests'; // Import hàm lẻ, không dùng requestApi
import { useAuth } from '../context/AuthContext';

const AssignedTasksPage: React.FC = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState<MyRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      // Gọi hàm API mới
      const res = await apiGetAssignedRequests(token!, { page, limit: 10 });
      setTasks(res.items);
      setTotal(res.total);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, token]);

  const getPriorityBadge = (p?: string) => {
    if (p === 'URGENT') return <span className="badge bg-danger">URGENT</span>;
    if (p === 'HIGH') return <span className="badge bg-warning text-dark">HIGH</span>;
    if (p === 'LOW') return <span className="badge bg-secondary">LOW</span>;
    return <span className="badge bg-info text-dark">MEDIUM</span>;
  };

  const getStatusBadge = (s: string) => {
    const map: any = {
      NEW: 'bg-secondary',
      IN_PROGRESS: 'bg-primary',
      PENDING: 'bg-warning text-dark',
      COMPLETED: 'bg-success',
      CANCELLED: 'bg-dark',
      REJECTED: 'bg-danger'
    };
    return <span className={`badge ${map[s] || 'bg-light text-dark border'}`}>{s}</span>;
  };

  return (
    <div className="container py-4 font-sans">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="fw-bold text-primary mb-0"><i className="bi bi-briefcase-fill me-2"></i>My Assigned Tasks</h2>
          <p className="text-muted small mt-1">Danh sách các yêu cầu bạn cần xử lý</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={fetchTasks}>
           <i className="bi bi-arrow-clockwise me-1"></i> Refresh
        </button>
      </div>
      
      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
      ) : tasks.length === 0 ? (
        <div className="alert alert-success shadow-sm border-0">
          <i className="bi bi-check-circle-fill me-2"></i> Tuyệt vời! Bạn không có công việc nào tồn đọng.
        </div>
      ) : (
        <div className="card shadow-sm border-0">
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="ps-4">Ticket</th>
                  <th>Người yêu cầu</th>
                  <th>Mức độ</th>
                  <th>Trạng thái</th>
                  <th>Deadline</th>
                  <th className="text-end pe-4">Hành động</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task._id} className={task.status === 'IN_PROGRESS' ? 'bg-primary bg-opacity-10' : ''}>
                    <td className="ps-4">
                      <div className="fw-bold text-dark">{task.title}</div>
                      <div className="small text-muted">
                        <span className="fw-semibold text-uppercase" style={{fontSize: '0.75rem'}}>{task.category}</span>
                        <span className="mx-1">•</span>
                        {new Date(task.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                         <div className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center me-2" style={{width: 30, height: 30, fontSize: 12}}>
                            {task.requester?.name?.[0] || '?'}
                         </div>
                         <div>
                            <div className="fw-medium" style={{fontSize: '0.9rem'}}>{task.requester?.name}</div>
                            <div className="text-muted" style={{fontSize: '0.75rem'}}>User</div>
                         </div>
                      </div>
                    </td>
                    <td>{getPriorityBadge(task.priority)}</td>
                    <td>{getStatusBadge(task.status)}</td>
                    <td>
                       {task.dueDate ? (
                         <span className={new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' ? 'text-danger fw-bold' : ''}>
                           {new Date(task.dueDate).toLocaleDateString('vi-VN')}
                         </span>
                       ) : '-'}
                    </td>
                    <td className="text-end pe-4">
                      <Link to={`/requests/${task._id}`} className="btn btn-sm btn-primary px-3 rounded-pill">
                        Xử lý <i className="bi bi-arrow-right ms-1"></i>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {Math.ceil(total/10) > 1 && (
             <div className="card-footer bg-white d-flex justify-content-end py-3">
                <button className="btn btn-sm btn-light border me-2" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button>
                <button className="btn btn-sm btn-light border" disabled={tasks.length < 10} onClick={()=>setPage(p=>p+1)}>Next</button>
             </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignedTasksPage;