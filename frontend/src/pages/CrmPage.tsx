import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCrmDeals, assignDeal, updateDealStatus, createCrmDeal, CrmDeal } from '../api/crm';
import { apiGetStaffsByDept, UserItem } from '../api/users';
import { useAuth } from '../context/AuthContext';

// --- UTILS UI ---

// Function to generate consistent random colors based on name
const getAvatarColor = (name: string) => {
  const colors = ['bg-primary', 'bg-success', 'bg-danger', 'bg-warning text-dark', 'bg-info text-dark', 'bg-secondary'];
  let hash = 0;
  const safeName = name || '';
  for (let i = 0; i < safeName.length; i++) {
    hash = safeName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

// --- COMPONENTS ---

const StatusBadge = ({ status }: { status: string }) => {
  let color = 'secondary';
  let label = status;
  let icon = 'bi-circle';

  switch (status) {
    case 'NEW': color = 'primary'; label = 'New'; icon = 'bi-star'; break;
    case 'ASSIGNED': color = 'info'; label = 'Assigned'; icon = 'bi-person-gear'; break;
    case 'IN_PROGRESS': color = 'warning'; label = 'In Progress'; icon = 'bi-chat-dots'; break;
    case 'WIN': color = 'success'; label = 'Won'; icon = 'bi-trophy-fill'; break;
    case 'LOSE': color = 'danger'; label = 'Lost'; icon = 'bi-x-circle-fill'; break;
  }

  return (
    <span className={`badge bg-${color} bg-opacity-10 text-${color} border border-${color} border-opacity-25 px-3 py-2 rounded-pill fw-medium`}>
      <i className={`bi ${icon} me-1`}></i> {label}
    </span>
  );
};

const CreateDealModal = ({ show, onClose, onSuccess, token }: any) => {
  const [formData, setFormData] = useState({
    fullName: '', email: '', phoneNumber: '', companyName: '', requirement: '', note: ''
  });
  const [submitting, setSubmitting] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCrmDeal(token, formData);
      setFormData({ fullName: '', email: '', phoneNumber: '', companyName: '', requirement: '', note: '' });
      onSuccess();
      onClose();
    } catch (err) {
      alert('Error creating Deal (Missing information or network error)');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg rounded-4">
          {/* Header */}
          <div className="modal-header border-bottom-0 pb-0">
            <div>
              <h5 className="modal-title fw-bold text-dark">Create New Opportunity</h5>
              <p className="text-muted small mb-0">Enter lead information into the system.</p>
            </div>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body p-4 pt-3">
              <div className="row g-3">
                <div className="col-12"><h6 className="text-primary fw-bold small text-uppercase border-bottom pb-2 mb-2">1. Contact Information</h6></div>
                
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Customer Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control bg-light" required placeholder="Ex: John Doe"
                    value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Phone Number <span className="text-danger">*</span></label>
                  <input type="text" className="form-control bg-light" required placeholder="Ex: +1 234..."
                    value={formData.phoneNumber} onChange={e => setFormData({...formData, phoneNumber: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Email</label>
                  <input type="email" className="form-control bg-light" placeholder="email@company.com"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                <div className="col-md-6">
                  <label className="form-label small fw-bold">Company / Organization</label>
                  <input type="text" className="form-control bg-light" placeholder="Company Name..."
                    value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                </div>
                
                <div className="col-12 mt-4"><h6 className="text-primary fw-bold small text-uppercase border-bottom pb-2 mb-2">2. Detailed Requirements</h6></div>
                
                <div className="col-12">
                  <label className="form-label small fw-bold">Requirements <span className="text-danger">*</span></label>
                  <textarea className="form-control bg-light" rows={3} required placeholder="Customer needs advice on..."
                    value={formData.requirement} onChange={e => setFormData({...formData, requirement: e.target.value})}></textarea>
                </div>
                <div className="col-12">
                  <label className="form-label small fw-bold">Internal Notes</label>
                  <textarea className="form-control bg-light" rows={2} placeholder="Notes for sales staff..."
                    value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})}></textarea>
                </div>
              </div>
            </div>
            <div className="modal-footer border-top-0 pt-0 pb-4 pe-4">
              <button type="button" className="btn btn-light fw-medium" onClick={onClose}>Close</button>
              <button type="submit" className="btn btn-primary px-4 fw-bold shadow-sm" disabled={submitting}>
                {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="bi bi-check-lg me-2"></i>Create Deal</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// --- MAIN PAGE ---

const CrmPage = () => {
  const { user, token } = useAuth();
  const [deals, setDeals] = useState<CrmDeal[]>([]);
  const [staffs, setStaffs] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const isManager = user?.roles?.includes('SALE_MANAGER') || user?.roles?.includes('ADMIN');

  useEffect(() => { if (token) fetchData(); }, [token]);

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const dealsData = await getCrmDeals(token);
      setDeals(dealsData);
      if (isManager) {
        apiGetStaffsByDept(token, 'SALES').then(setStaffs).catch(() => {});
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (dealId: string, userId: string) => {
    if (!userId || !token) return;
    try { 
        await assignDeal(token, dealId, userId); 
        alert('Person in charge updated!'); 
        fetchData(); 
    } catch (err) { 
        alert('Assignment error (You can only assign tasks to yourself)'); 
    }
  };

  const handleStatusChange = async (dealId: string, status: string) => {
    if (!token || !window.confirm(`Confirm status change to: ${status}?`)) return;
    try { await updateDealStatus(token, dealId, status); fetchData(); } 
    catch (err) { alert('Update error'); }
  };

  const filteredDeals = deals.filter(deal => {
    const s = searchTerm.toLowerCase();
    return (
        (deal.customer?.fullName || '').toLowerCase().includes(s) ||
        (deal.customer?.companyName || '').toLowerCase().includes(s) ||
        (deal.requirement || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="container-fluid p-0">
      {/* 1. HEADER SECTION */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4">
        <div>
          <h4 className="fw-bold text-dark mb-1">Sales Pipeline</h4>
          <p className="text-muted small mb-0">Manage sales opportunities and track progress.</p>
        </div>
        
        <div className="d-flex align-items-center gap-2 mt-3 mt-md-0">
            <div className="input-group input-group-sm shadow-sm" style={{ maxWidth: '280px' }}>
                <span className="input-group-text bg-white border-end-0 ps-3"><i className="bi bi-search text-muted"></i></span>
                <input 
                    type="text" 
                    className="form-control border-start-0 ps-2 py-2" 
                    placeholder="Search name, company, requirement..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <button className="btn btn-sm btn-white border shadow-sm py-2 px-3" onClick={fetchData} title="Refresh">
              <i className="bi bi-arrow-clockwise text-primary"></i>
            </button>
            <button className="btn btn-sm btn-primary shadow-sm py-2 px-3 fw-bold" onClick={() => setShowModal(true)}>
              <i className="bi bi-plus-lg me-2"></i>Create New
            </button>
        </div>
      </div>

      {/* 2. TABLE CARD SECTION */}
      <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
        {loading ? (
           <div className="text-center py-5"><div className="spinner-border text-primary"></div><p className="text-muted mt-2 small">Loading data...</p></div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0" style={{ minWidth: '900px' }}>
              <thead className="bg-light border-bottom">
                <tr className="text-muted small text-uppercase fw-bold" style={{ letterSpacing: '0.5px' }}>
                  <th className="ps-4 py-3 border-0" style={{width: '30%'}}>Customer / Company</th>
                  <th className="py-3 border-0" style={{width: '25%'}}>Requirement</th>
                  <th className="py-3 border-0 text-center" style={{width: '15%'}}>Status</th>
                  <th className="py-3 border-0" style={{width: '15%'}}>Assigned To</th>
                  <th className="pe-4 py-3 border-0 text-end" style={{width: '15%'}}></th>
                </tr>
              </thead>
              <tbody>
                {filteredDeals.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-5 text-muted fst-italic">No matching deals found.</td></tr>
                ) : filteredDeals.map((deal) => (
                  <tr key={deal._id} style={{ cursor: 'pointer' }} className="position-relative">
                    {/* Column 1: Customer */}
                    <td className="ps-4 py-3">
                      <div className="d-flex align-items-center">
                        <div className={`avatar-initial rounded-circle text-white fw-bold d-flex align-items-center justify-content-center me-3 shadow-sm ${getAvatarColor(deal.customer?.fullName)}`} style={{width: 42, height: 42, fontSize: '1.1rem'}}>
                            {(deal.customer?.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <Link to={`/crm/${deal._id}`} className="fw-bold text-dark text-decoration-none hover-text-primary stretched-link">
                                {deal.customer?.fullName || 'No Name'}
                            </Link>
                            <div className="small text-muted d-flex align-items-center mt-1">
                                {deal.customer?.companyName ? <><i className="bi bi-building me-1"></i>{deal.customer.companyName}</> : <span className="fst-italic">Individual</span>}
                            </div>
                            {deal.customer?.phoneNumber && <div className="small text-muted"><i className="bi bi-telephone me-1"></i>{deal.customer.phoneNumber}</div>}
                        </div>
                      </div>
                    </td>

                    {/* Column 2: Requirement */}
                    <td className="py-3">
                        <div className="text-truncate fw-medium text-dark" style={{maxWidth: '250px'}} title={deal.requirement}>
                            {deal.requirement}
                        </div>
                        {deal.note && <div className="text-truncate small text-muted fst-italic mt-1" style={{maxWidth: '250px'}}><i className="bi bi-sticky me-1"></i>{deal.note}</div>}
                    </td>

                    {/* Column 3: Status */}
                    <td className="text-center py-3"><StatusBadge status={deal.status} /></td>

                    {/* Column 4: Assigned To */}
                    <td className="py-3 position-relative" style={{ zIndex: 2 }}> {/* z-index to allow select box interaction */}
                      {isManager ? (
                          <select 
                            className="form-select form-select-sm border-0 bg-transparent text-dark fw-medium px-0 cursor-pointer shadow-none" 
                            style={{width: '100%'}}
                            value={deal.assignedTo?._id || ''} 
                            onChange={(e) => handleAssign(deal._id, e.target.value)}
                            onClick={(e) => e.stopPropagation()} 
                          >
                            <option value="" className="text-muted">-- Unassigned --</option>
                            {staffs.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
                          </select>
                      ) : (
                        deal.assignedTo ? (
                            <div className="d-flex align-items-center">
                                <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-2 small ${getAvatarColor(deal.assignedTo.name)}`} style={{width: 24, height: 24, fontSize: '0.7rem'}}>
                                    {deal.assignedTo.name.charAt(0)}
                                </div>
                                <span className="text-dark small fw-medium">
                                    {deal.assignedTo._id === user?._id ? 'Me' : deal.assignedTo.name}
                                </span>
                            </div>
                        ) : (
                            <button 
                                className="btn btn-sm btn-outline-primary rounded-pill px-3 py-0 small"
                                style={{fontSize: '0.8rem'}}
                                onClick={(e) => { e.stopPropagation(); handleAssign(deal._id, user?._id || ''); }}
                            >
                                <i className="bi bi-hand-index-thumb me-1"></i> Assign to Me
                            </button>
                        )
                      )}
                    </td>

                    {/* Column 5: Actions */}
                    <td className="pe-4 text-end position-relative" style={{ zIndex: 2 }}>
                      <div className="d-flex justify-content-end gap-1">
                          {deal.status !== 'WIN' && deal.status !== 'LOSE' && (
                            <>
                                <button className="btn btn-sm btn-light text-success hover-bg-success-light border-0 rounded-circle" 
                                        style={{width: 32, height: 32}}
                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(deal._id, 'WIN'); }} 
                                        title="Mark as Won">
                                    <i className="bi bi-check-lg"></i>
                                </button>
                                <button className="btn btn-sm btn-light text-danger hover-bg-danger-light border-0 rounded-circle" 
                                        style={{width: 32, height: 32}}
                                        onClick={(e) => { e.stopPropagation(); handleStatusChange(deal._id, 'LOSE'); }} 
                                        title="Mark as Lost">
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </>
                          )}
                          <Link to={`/crm/${deal._id}`} className="btn btn-sm btn-light text-primary hover-bg-primary-light border-0 rounded-circle d-flex align-items-center justify-content-center" 
                                style={{width: 32, height: 32}}
                                title="View Details">
                              <i className="bi bi-arrow-right"></i>
                          </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Render Modal */}
      <CreateDealModal 
        show={showModal} 
        onClose={() => setShowModal(false)} 
        onSuccess={fetchData} 
        token={token} 
      />
    </div>
  );
};

export default CrmPage;