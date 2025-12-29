import React, { useState } from 'react';
import { submitPublicRequest } from '../api/crm';
import { Link } from 'react-router-dom';

// =============================================================================
// 1. CÁC COMPONENT TĨNH (Đưa ra ngoài để không bị render lại)
// =============================================================================

const Navbar = () => (
  <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top py-3">
    <div className="container">
      <a className="navbar-brand fw-bold fs-4" href="#">
        <i className="bi bi-grid-3x3-gap-fill me-2 text-primary"></i>
        TechSolutions
      </a>
      <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
        <span className="navbar-toggler-icon"></span>
      </button>
      <div className="collapse navbar-collapse justify-content-end" id="navbarNav">
        <ul className="navbar-nav gap-3 align-items-center">
          <li className="nav-item"><a className="nav-link text-white" href="#features">Giải pháp</a></li>
          <li className="nav-item"><a className="nav-link text-white" href="#about">Về chúng tôi</a></li>
          <li className="nav-item">
            <a href="#contact" className="btn btn-primary px-4 rounded-pill">Liên hệ ngay</a>
          </li>
          <li className="nav-item border-start ps-3 ms-2 border-secondary">
             <Link to="/login" className="nav-link text-warning fw-bold">Nội bộ Login</Link>
          </li>
        </ul>
      </div>
    </div>
  </nav>
);

const HeroSection = () => (
  <section className="bg-dark text-white py-5 position-relative overflow-hidden">
      <div className="position-absolute top-0 start-0 w-100 h-100" 
           style={{background: 'radial-gradient(circle at top right, #0d6efd 0%, transparent 40%)', opacity: 0.2}}></div>
      
      <div className="container py-5 position-relative z-1">
          <div className="row align-items-center g-5">
              <div className="col-lg-6">
                  <h1 className="display-4 fw-bold mb-4">Chuyển đổi số toàn diện cho doanh nghiệp của bạn</h1>
                  <p className="lead text-white-50 mb-4">
                      Hệ thống ERP, CRM và Quản trị nhân sự tích hợp AI giúp tối ưu hóa quy trình, 
                      nâng cao hiệu suất làm việc và tăng trưởng doanh thu vượt bậc.
                  </p>
                  <div className="d-flex gap-3">
                      <a href="#contact" className="btn btn-primary btn-lg rounded-pill px-5">Tư vấn miễn phí</a>
                      <a href="#features" className="btn btn-outline-light btn-lg rounded-pill px-5">Tìm hiểu thêm</a>
                  </div>
              </div>
              <div className="col-lg-6 text-center">
                  <img 
                      src="https://placehold.co/600x400/1e2327/FFF?text=Enterprise+Dashboard+UI" 
                      alt="Dashboard Preview" 
                      className="img-fluid rounded-4 shadow-lg border border-secondary"
                  />
              </div>
          </div>
      </div>
  </section>
);

const FeaturesSection = () => (
  <section id="features" className="py-5 bg-light">
      <div className="container py-5">
          <div className="text-center mb-5">
              <h2 className="fw-bold">Tại sao chọn chúng tôi?</h2>
              <p className="text-muted">Giải pháp công nghệ tiên tiến được tin dùng bởi 500+ doanh nghiệp</p>
          </div>
          <div className="row g-4">
              <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm p-4 text-center hover-shadow transition">
                      <div className="mb-3 text-primary"><i className="bi bi-cpu fs-1"></i></div>
                      <h4 className="fw-bold">Tích hợp AI</h4>
                      <p className="text-muted">Tự động phân loại yêu cầu, gợi ý giải pháp và hỗ trợ ra quyết định thông minh với Google Gemini.</p>
                  </div>
              </div>
              <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm p-4 text-center">
                      <div className="mb-3 text-success"><i className="bi bi-graph-up-arrow fs-1"></i></div>
                      <h4 className="fw-bold">Quản lý CRM</h4>
                      <p className="text-muted">Theo dõi hành trình khách hàng, quản lý Sales Pipeline và tối ưu tỷ lệ chốt đơn (Win Rate).</p>
                  </div>
              </div>
              <div className="col-md-4">
                  <div className="card h-100 border-0 shadow-sm p-4 text-center">
                      <div className="mb-3 text-warning"><i className="bi bi-people-fill fs-1"></i></div>
                      <h4 className="fw-bold">Nhân sự & Quy trình</h4>
                      <p className="text-muted">Số hóa quy trình duyệt đơn từ, quản lý nhân sự và đánh giá KPI minh bạch, hiệu quả.</p>
                  </div>
              </div>
          </div>
      </div>
  </section>
);

const Footer = () => (
  <footer className="bg-dark text-white-50 py-4 border-top border-secondary">
      <div className="container text-center">
          <p className="mb-0">&copy; 2024 TechSolutions. All rights reserved.</p>
          <small>Privacy Policy | Terms of Service</small>
      </div>
  </footer>
);

// =============================================================================
// 2. MAIN COMPONENT (Chứa Logic và State)
// =============================================================================

const PublicContactPage = () => {
  // --- STATE QUẢN LÝ FORM ---
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    companyName: '',
    requirement: ''
  });
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');

  // --- XỬ LÝ GỬI FORM ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    try {
      await submitPublicRequest(form);
      setStatus('SUCCESS');
      setForm({ fullName: '', email: '', phoneNumber: '', companyName: '', requirement: '' });
    } catch (error) {
      console.error(error);
      setStatus('ERROR');
    }
  };

  return (
    <div className="bg-white text-dark w-100">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      
      {/* --- PHẦN CONTACT FORM (Viết trực tiếp ở đây để giữ Focus khi gõ) --- */}
      <section id="contact" className="py-5">
        <div className="container py-5">
            <div className="row g-5 align-items-center">
                {/* Contact Info */}
                <div className="col-lg-5">
                    <h2 className="fw-bold mb-4">Liên hệ hợp tác</h2>
                    <p className="lead mb-4">Để lại thông tin, chuyên viên tư vấn của chúng tôi sẽ liên hệ lại trong vòng 30 phút.</p>
                    
                    <div className="d-flex mb-3">
                        <div className="flex-shrink-0 btn-lg-square bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                            <i className="bi bi-geo-alt-fill"></i>
                        </div>
                        <div className="ms-3">
                            <h5 className="mb-0">Địa chỉ</h5>
                            <p className="text-muted">Tòa nhà TechBuilding, Hà Nội, Việt Nam</p>
                        </div>
                    </div>
                    <div className="d-flex mb-3">
                        <div className="flex-shrink-0 bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                            <i className="bi bi-telephone-fill"></i>
                        </div>
                        <div className="ms-3">
                            <h5 className="mb-0">Hotline</h5>
                            <p className="text-muted">+84 987 654 321</p>
                        </div>
                    </div>
                    <div className="d-flex">
                        <div className="flex-shrink-0 bg-primary bg-opacity-10 text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 50, height: 50}}>
                            <i className="bi bi-envelope-fill"></i>
                        </div>
                        <div className="ms-3">
                            <h5 className="mb-0">Email</h5>
                            <p className="text-muted">contact@techsolutions.vn</p>
                        </div>
                    </div>
                </div>

                {/* Form Input */}
                <div className="col-lg-7">
                    <div className="card border-0 shadow-lg">
                        <div className="card-body p-5">
                            {status === 'SUCCESS' ? (
                                <div className="text-center py-5">
                                    <div className="mb-3 text-success"><i className="bi bi-check-circle-fill fs-1"></i></div>
                                    <h3 className="fw-bold text-success">Gửi yêu cầu thành công!</h3>
                                    <p className="text-muted">Cảm ơn bạn đã quan tâm. Đội ngũ Sale sẽ liên hệ với bạn sớm nhất.</p>
                                    <button className="btn btn-outline-primary mt-3" onClick={() => setStatus('IDLE')}>Gửi yêu cầu khác</button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit}>
                                    <h3 className="fw-bold mb-4 text-center">Đăng ký tư vấn</h3>
                                    {status === 'ERROR' && <div className="alert alert-danger">Có lỗi xảy ra, vui lòng thử lại!</div>}
                                    
                                    <div className="row g-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Họ và Tên <span className="text-danger">*</span></label>
                                            <input 
                                                type="text" className="form-control form-control-lg bg-light" placeholder="Nguyễn Văn A" required
                                                value={form.fullName} 
                                                onChange={e => setForm({...form, fullName: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-bold">Số điện thoại <span className="text-danger">*</span></label>
                                            <input 
                                                type="text" className="form-control form-control-lg bg-light" placeholder="0909..." required
                                                value={form.phoneNumber} 
                                                onChange={e => setForm({...form, phoneNumber: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Email công việc <span className="text-danger">*</span></label>
                                            <input 
                                                type="email" className="form-control form-control-lg bg-light" placeholder="name@company.com" required
                                                value={form.email} 
                                                onChange={e => setForm({...form, email: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Tên công ty</label>
                                            <input 
                                                type="text" className="form-control form-control-lg bg-light" placeholder="Công ty TNHH..."
                                                value={form.companyName} 
                                                onChange={e => setForm({...form, companyName: e.target.value})}
                                            />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label fw-bold">Nhu cầu chi tiết</label>
                                            <textarea 
                                                className="form-control form-control-lg bg-light" rows={4} 
                                                placeholder="Tôi cần tư vấn về..." required
                                                value={form.requirement} 
                                                onChange={e => setForm({...form, requirement: e.target.value})}
                                            ></textarea>
                                        </div>
                                        <div className="col-12 mt-4">
                                            <button 
                                                type="submit" 
                                                className="btn btn-primary btn-lg w-100 py-3 fw-bold shadow-sm"
                                                disabled={status === 'LOADING'}
                                            >
                                                {status === 'LOADING' ? (
                                                    <span><span className="spinner-border spinner-border-sm me-2"></span>Đang gửi...</span>
                                                ) : 'Gửi Yêu Cầu Tư Vấn'}
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default PublicContactPage;