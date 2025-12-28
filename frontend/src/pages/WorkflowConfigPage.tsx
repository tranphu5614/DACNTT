import React, { useEffect, useState } from 'react';
import { apiGetWorkflows, apiSaveWorkflow, apiDeleteWorkflow, WorkflowItem } from '../api/workflows';
import { useAuth } from '../context/AuthContext';

const ROLES = ['MANAGER', 'HR_MANAGER', 'IT_MANAGER', 'ADMIN', 'CEO'];
const CATEGORIES = ['HR', 'IT', 'GENERAL'];

const KNOWN_REQUEST_TYPES = [
  { key: 'leave_request', label: 'Leave Request (leave_request)' },
  { key: 'purchase_request', label: 'Equipment Purchase (purchase_request)' },
  { key: 'overtime_request', label: 'Overtime Request (overtime_request)' },
  { key: 'wfh_request', label: 'Work From Home (wfh_request)' },
  { key: 'resignation_request', label: 'Resignation (resignation_request)' },
];

const getCategoryBadge = (cat: string) => {
  switch(cat) {
    case 'HR': return 'bg-purple-subtle text-purple border-purple';
    case 'IT': return 'bg-blue-subtle text-primary border-primary';
    default: return 'bg-light text-dark border-secondary';
  }
};

const WorkflowConfigPage: React.FC = () => {
  const { token } = useAuth();
  const [workflows, setWorkflows] = useState<WorkflowItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCustomType, setIsCustomType] = useState(false);

  const [formData, setFormData] = useState<WorkflowItem>({
    typeKey: '', 
    name: '', 
    category: 'GENERAL', 
    steps: [],
    isActive: true 
  });

  useEffect(() => {
    loadData();
  }, [token]);

  const loadData = async () => {
    if (!token) return;
    try {
      const data = await apiGetWorkflows(token);
      setWorkflows(data);
    } catch (err) { console.error(err); }
  };

  const handleSave = async () => {
    if (!formData.typeKey || !formData.name) return alert('Please enter both Key and Name');
    try {
      await apiSaveWorkflow(token!, formData);
      alert('Configuration saved successfully!');
      setEditingId(null);
      setFormData({ typeKey: '', name: '', category: 'GENERAL', steps: [], isActive: true });
      setIsCustomType(false);
      loadData();
    } catch (err) { alert('Error while saving'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('This action will permanently delete this workflow. Continue?')) return;
    try {
      await apiDeleteWorkflow(token!, id);
      loadData();
      if (editingId === id) setEditingId(null);
    } catch (err) { alert('Error while deleting'); }
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, { level: formData.steps.length + 1, role: 'MANAGER' }]
    });
  };

  const removeStep = (idx: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== idx);
    const reindexed = newSteps.map((s, i) => ({ ...s, level: i + 1 }));
    setFormData({ ...formData, steps: reindexed });
  };

  const updateStepRole = (idx: number, role: string) => {
    const newSteps = [...formData.steps];
    newSteps[idx].role = role;
    setFormData({ ...formData, steps: newSteps });
  };

  const startEdit = (wf: WorkflowItem) => {
    setEditingId(wf._id || 'new');
    setFormData({ ...JSON.parse(JSON.stringify(wf)), isActive: wf.isActive ?? true });
    setIsCustomType(false);
  };

  const startNew = () => {
    setEditingId('new');
    setFormData({ typeKey: '', name: '', category: 'GENERAL', steps: [], isActive: true });
    setIsCustomType(false);
  };

  const filteredWorkflows = workflows.filter(w => 
    (w.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (w.typeKey || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container-fluid py-4 bg-light min-vh-100 font-sans">
      
      <div className="d-flex justify-content-between align-items-center mb-4 px-2">
        <div>
          <h3 className="fw-bold text-dark mb-1">
            <i className="bi bi-diagram-flow me-2 text-primary"></i>
            Approval Workflows
          </h3>
          <p className="text-muted small mb-0">Manage automated approval processes for various request types</p>
        </div>
        <div>
            <button className="btn btn-primary shadow-sm" onClick={startNew}>
                <i className="bi bi-plus-lg me-2"></i>Create New
            </button>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-lg-4 col-md-5">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-white border-bottom py-3">
               <div className="input-group">
                  <span className="input-group-text bg-light border-end-0"><i className="bi bi-search text-muted"></i></span>
                  <input 
                    type="text" 
                    className="form-control bg-light border-start-0 ps-0 focus-ring-none" 
                    placeholder="Search workflows..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
            <div className="list-group list-group-flush overflow-auto custom-scrollbar" style={{maxHeight: 'calc(100vh - 250px)'}}>
              {filteredWorkflows.length === 0 ? (
                  <div className="text-center py-5 text-muted">
                      <i className="bi bi-inbox fs-1 d-block mb-2 opacity-50"></i>
                      No data found
                  </div>
              ) : (
                  filteredWorkflows.map(wf => (
                    <div 
                        key={wf._id} 
                        onClick={() => startEdit(wf)}
                        className={`list-group-item list-group-item-action p-3 border-start border-4 cursor-pointer transition-all ${
                            editingId === wf._id 
                            ? 'border-primary bg-primary-subtle' 
                            : 'border-transparent hover-bg-light'
                        }`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="fw-bold text-dark">
                          <span className={`d-inline-block rounded-circle me-2 ${wf.isActive !== false ? 'bg-success' : 'bg-danger'}`} 
                                style={{width: 8, height: 8}}></span>
                          {wf.name}
                        </span>
                        <span className={`badge border ${getCategoryBadge(wf.category)}`} style={{fontSize: '0.65rem'}}>
                            {wf.category}
                        </span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center">
                          <code className="text-muted small">{wf.typeKey}</code>
                          <span className="badge bg-light text-secondary rounded-pill border">
                              {wf.steps.length} steps
                          </span>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-8 col-md-7">
          {editingId ? (
            <div className="card shadow-sm border-0 animate__animated animate__fadeIn">
              <div className="card-header bg-white py-3 d-flex justify-content-between align-items-center border-bottom">
                <h5 className="mb-0 fw-bold text-primary">
                    {editingId === 'new' ? <><i className="bi bi-plus-circle me-2"></i>Create New Workflow</> : <><i className="bi bi-pencil-square me-2"></i>Edit Workflow</>}
                </h5>
                {editingId !== 'new' && (
                    <button className="btn btn-outline-danger btn-sm" onClick={() => handleDelete(editingId)}>
                        <i className="bi bi-trash me-1"></i> Delete
                    </button>
                )}
              </div>

              <div className="card-body p-4">
                <h6 className="text-uppercase text-muted fw-bold small mb-3 ls-1">Basic Information</h6>
                <div className="row g-3 mb-4">
                  <div className="col-md-6">
                    <label className="form-label fw-medium small">Type Key <span className="text-danger">*</span></label>
                    <div className="input-group">
                        <span className="input-group-text bg-light"><i className="bi bi-key"></i></span>
                        {editingId === 'new' ? (
                            !isCustomType ? (
                                <select 
                                    className="form-select font-monospace"
                                    value={formData.typeKey}
                                    onChange={e => {
                                        const val = e.target.value;
                                        if (val === 'custom') {
                                            setIsCustomType(true);
                                            setFormData({...formData, typeKey: ''});
                                        } else {
                                            const selected = KNOWN_REQUEST_TYPES.find(t => t.key === val);
                                            setFormData({
                                                ...formData, 
                                                typeKey: val,
                                                name: formData.name || (selected ? selected.label.split('(')[0].trim() : '')
                                            });
                                        }
                                    }}
                                >
                                    <option value="">-- Select Request Type --</option>
                                    {KNOWN_REQUEST_TYPES.map(t => (
                                        <option key={t.key} value={t.key}>{t.label}</option>
                                    ))}
                                    <option value="custom" className="fw-bold border-top">✏️ Enter custom key...</option>
                                </select>
                            ) : (
                                <div className="d-flex flex-grow-1">
                                    <input 
                                        type="text" 
                                        className="form-control font-monospace" 
                                        placeholder="e.g. new_request_type" 
                                        value={formData.typeKey}
                                        autoFocus
                                        onChange={e => setFormData({...formData, typeKey: e.target.value})} 
                                    />
                                    <button 
                                        className="btn btn-outline-secondary" 
                                        onClick={() => setIsCustomType(false)}
                                        title="Back to list"
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                </div>
                            )
                        ) : (
                            <input 
                                type="text" 
                                className="form-control font-monospace bg-light" 
                                value={formData.typeKey} 
                                disabled 
                            />
                        )}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium small">Display Name <span className="text-danger">*</span></label>
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="e.g. Leave Request" 
                        value={formData.name} 
                        onChange={e => setFormData({...formData, name: e.target.value})} 
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-medium small">Department / Category</label>
                    <div className="d-flex gap-2">
                        {CATEGORIES.map(c => (
                            <button 
                                key={c}
                                type="button"
                                className={`btn btn-sm px-3 ${formData.category === c ? 'btn-dark' : 'btn-outline-secondary'}`}
                                onClick={() => setFormData({...formData, category: c})}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                  </div>

                  <div className="col-md-6">
                    <label className="form-label fw-medium small">Activity Status</label>
                    <div className="form-check form-switch pt-1">
                      <input 
                        className="form-check-input ms-0 me-2" 
                        type="checkbox" 
                        role="switch" 
                        id="wfActiveSwitch"
                        checked={formData.isActive !== false}
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        style={{ width: '2.5rem', height: '1.25rem', cursor: 'pointer' }}
                      />
                      <label className="form-check-label fw-bold cursor-pointer" htmlFor="wfActiveSwitch">
                        {formData.isActive !== false ? (
                          <span className="text-success">Active</span>
                        ) : (
                          <span className="text-danger">Inactive</span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                <hr className="my-4 opacity-10" />

                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h6 className="text-uppercase text-muted fw-bold small mb-0 ls-1">Approval Sequence</h6>
                  <button className="btn btn-sm btn-soft-primary fw-bold" onClick={addStep}>
                      <i className="bi bi-node-plus-fill me-1"></i> Add Approval Level
                  </button>
                </div>

                {formData.steps.length === 0 ? (
                    <div className="alert alert-warning border-0 d-flex align-items-center" role="alert">
                        <i className="bi bi-exclamation-triangle-fill me-3 fs-4"></i>
                        <div>
                            <strong>No approval steps configured!</strong>
                            <div className="small">Requests of this type will be auto-approved or won't require approval.</div>
                        </div>
                    </div>
                ) : (
                    <div className="position-relative ps-4 border-start border-2 border-light ms-2">
                        {formData.steps.map((step, idx) => (
                            <div key={idx} className="mb-4 position-relative animate__animated animate__fadeInLeft" style={{animationDelay: `${idx * 0.1}s`}}>
                                <div className="position-absolute top-0 start-0 translate-middle rounded-circle bg-white border border-4 border-primary shadow-sm" 
                                     style={{width: 24, height: 24, left: '-1px'}}></div>
                                
                                <div className="card border ms-3 shadow-sm hover-shadow transition-all">
                                    <div className="card-body py-2 px-3 d-flex align-items-center justify-content-between">
                                        <div className="d-flex align-items-center gap-3 flex-grow-1">
                                            <div className="bg-light rounded p-2 text-center" style={{minWidth: 60}}>
                                                <div className="small text-muted fw-bold text-uppercase" style={{fontSize: '0.65rem'}}>Level</div>
                                                <div className="h5 mb-0 fw-bold text-primary">{step.level}</div>
                                            </div>
                                            
                                            <div className="flex-grow-1">
                                                <label className="small text-muted mb-1 d-block">Approver (Role)</label>
                                                <select 
                                                    className="form-select form-select-sm fw-medium border-0 bg-light" 
                                                    value={step.role} 
                                                    onChange={e => updateStepRole(idx, e.target.value)}
                                                >
                                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <button className="btn btn-link text-danger p-2 ms-2" onClick={() => removeStep(idx)} title="Remove step">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                {idx < formData.steps.length - 1 && (
                                    <div className="position-absolute start-0 border-start border-2 border-light" style={{height: 20, top: '100%', left: '-1px'}}></div>
                                )}
                            </div>
                        ))}
                        
                        <div className="position-relative">
                             <div className="position-absolute top-0 start-0 translate-middle rounded-circle bg-success text-white d-flex align-items-center justify-content-center shadow-sm" 
                                     style={{width: 24, height: 24, left: '-1px', fontSize: 10}}>
                                 <i className="bi bi-check-lg"></i>
                             </div>
                             <div className="ms-3 text-muted small fst-italic pt-1">End of process</div>
                        </div>
                    </div>
                )}

                <div className="d-flex justify-content-end gap-2 mt-5 pt-3 border-top">
                  <button className="btn btn-light px-4 fw-medium" onClick={() => setEditingId(null)}>Cancel</button>
                  <button className="btn btn-primary px-4 fw-bold shadow-sm" onClick={handleSave}>
                      <i className="bi bi-save2-fill me-2"></i>Save Changes
                  </button>
                </div>

              </div>
            </div>
          ) : (
            <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted border rounded-3 bg-white p-5 shadow-sm" style={{minHeight: 400}}>
                <div className="bg-light rounded-circle p-4 mb-3">
                    <i className="bi bi-diagram-3 fs-1 text-secondary opacity-50"></i>
                </div>
                <h5 className="fw-medium">No workflow selected</h5>
                <p className="small mb-4 text-center" style={{maxWidth: 300}}>Select a workflow from the list on the left to edit or create a new one.</p>
                <button className="btn btn-primary" onClick={startNew}>
                    <i className="bi bi-plus-lg me-2"></i>Create New Workflow
                </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkflowConfigPage;