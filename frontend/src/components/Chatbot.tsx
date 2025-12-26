import { useState, useRef, useEffect } from 'react';
import { apiChat } from '../api/ai';
import { useAuth } from '../context/AuthContext';

type Message = { role: 'user' | 'model'; text: string };

const THEME_COLOR = '#008784'; // Màu Teal chủ đạo của Odoo

export default function Chatbot() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Xin chào! Tôi là trợ lý ảo AI hỗ trợ nội bộ. Tôi có thể giúp gì cho bạn về các thủ tục HR hoặc sự cố IT?' }
  ]);
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading || !token) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        parts: m.text
      }));

      const res = await apiChat(token, history, userMsg);
      setMessages(prev => [...prev, { role: 'model', text: res.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: '⚠️ Hệ thống đang bận, vui lòng thử lại sau.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 1050, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif' }}>
      
      {/* 1. LAUNCHER BUTTON */}
      {!isOpen && (
        <button 
          className="btn rounded-circle shadow d-flex align-items-center justify-content-center text-white position-relative hover-scale"
          style={{ width: 56, height: 56, border: 'none', backgroundColor: THEME_COLOR, transition: 'transform 0.2s' }}
          onClick={() => setIsOpen(true)}
          title="Trợ lý ảo AI"
        >
          <i className="bi bi-chat-dots-fill fs-3"></i>
          {/* Notification Dot (Optional) */}
          <span className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
            <span className="visually-hidden">New alerts</span>
          </span>
        </button>
      )}

      {/* 2. CHAT WINDOW */}
      {isOpen && (
        <div className="card shadow-lg border-0 d-flex flex-column animate__animated animate__fadeInUp" 
             style={{ width: 380, height: 550, borderRadius: 16, overflow: 'hidden', maxWidth: 'calc(100vw - 40px)' }}>
          
          {/* Header */}
          <div className="card-header text-white d-flex justify-content-between align-items-center py-3 px-3" 
               style={{ backgroundColor: THEME_COLOR, borderBottom: 'none' }}>
            <div className="d-flex align-items-center gap-2">
              <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center" style={{width: 32, height: 32, color: THEME_COLOR}}>
                  <i className="bi bi-robot fs-5"></i>
              </div>
              <div>
                  <div className="fw-bold lh-1" style={{fontSize: '0.95rem'}}>Trợ lý ảo</div>
                  <small className="text-white-50" style={{fontSize: '0.7rem'}}>Luôn sẵn sàng hỗ trợ</small>
              </div>
            </div>
            <div className="d-flex gap-2">
                <button className="btn btn-sm text-white-50 hover-text-white p-0" onClick={() => setIsOpen(false)} title="Thu nhỏ">
                    <i className="bi bi-dash-lg"></i>
                </button>
                <button className="btn btn-sm text-white-50 hover-text-white p-0 ms-2" onClick={() => setIsOpen(false)} title="Đóng">
                    <i className="bi bi-x-lg"></i>
                </button>
            </div>
          </div>
          
          {/* Chat Body */}
          <div className="card-body p-3 bg-light d-flex flex-column" style={{ flex: 1, overflowY: 'auto', scrollbarWidth: 'thin' }}>
            
            {/* Disclaimer */}
            <div className="text-center mb-4 mt-2">
                <span className="badge bg-secondary-subtle text-secondary fw-normal border" style={{fontSize: '0.65rem'}}>
                    AI có thể mắc lỗi. Vui lòng kiểm tra thông tin quan trọng.
                </span>
            </div>

            {messages.map((m, idx) => (
              <div key={idx} className={`d-flex mb-3 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                {m.role === 'model' && (
                    <div className="flex-shrink-0 me-2 mt-1">
                        <div className="rounded-circle bg-white border d-flex align-items-center justify-content-center" style={{width: 28, height: 28, color: THEME_COLOR}}>
                            <i className="bi bi-robot"></i>
                        </div>
                    </div>
                )}
                <div 
                  className={`p-3 shadow-sm ${
                      m.role === 'user' 
                        ? 'text-white' 
                        : 'bg-white text-dark border'
                  }`}
                  style={{ 
                      maxWidth: '80%', 
                      fontSize: '0.9rem', 
                      whiteSpace: 'pre-wrap', 
                      lineHeight: '1.5',
                      backgroundColor: m.role === 'user' ? THEME_COLOR : '#fff',
                      borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px'
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            
            {loading && (
                <div className="d-flex justify-content-start mb-3">
                    <div className="bg-white border rounded-pill px-3 py-2 shadow-sm">
                        <div className="typing-indicator d-flex gap-1">
                            <span className="dot bg-secondary" style={{width: 6, height: 6, borderRadius: '50%', animation: 'bounce 1s infinite 0s'}}></span>
                            <span className="dot bg-secondary" style={{width: 6, height: 6, borderRadius: '50%', animation: 'bounce 1s infinite 0.2s'}}></span>
                            <span className="dot bg-secondary" style={{width: 6, height: 6, borderRadius: '50%', animation: 'bounce 1s infinite 0.4s'}}></span>
                        </div>
                    </div>
                </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Footer Input */}
          <div className="card-footer p-2 bg-white border-top">
            <div className="input-group">
              <input 
                className="form-control border-0 bg-light rounded-pill px-3 me-2" 
                placeholder="Nhập câu hỏi của bạn..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={loading}
                style={{fontSize: '0.9rem', height: 40}}
              />
              <button 
                className="btn rounded-circle d-flex align-items-center justify-content-center text-white shadow-sm transition-all" 
                onClick={handleSend} 
                disabled={loading || !input.trim()}
                style={{width: 40, height: 40, backgroundColor: THEME_COLOR, opacity: (!input.trim() || loading) ? 0.7 : 1}}
              >
                 <i className="bi bi-send-fill fs-6 ps-1"></i>
              </button>
            </div>
            <div className="text-center mt-1">
                <small className="text-muted" style={{fontSize: '0.6rem'}}>Powered by Gemini AI</small>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Animations */}
      <style>{`
        @keyframes bounce {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-4px); }
        }
        .hover-scale:hover { transform: scale(1.1) !important; }
        .hover-text-white:hover { color: #fff !important; }
      `}</style>
    </div>
  );
}