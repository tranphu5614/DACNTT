import { useState, useRef, useEffect } from 'react';
import { apiChat } from '../api/ai';
import { useAuth } from '../context/AuthContext';

type Message = { role: 'user' | 'model'; text: string };

export default function Chatbot() {
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Xin chào! Tôi là trợ lý ảo AI. Tôi có thể giúp gì cho bạn (IT/HR)?' }
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
      // Lấy 6 tin nhắn gần nhất làm context
      const history = messages.slice(-6).map(m => ({
        role: m.role,
        parts: m.text
      }));

      const res = await apiChat(token, history, userMsg);
      setMessages(prev => [...prev, { role: 'model', text: res.reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: '⚠️ Lỗi kết nối server.' }]);
    } finally {
      setLoading(false);
    }
  };

  if (!token) return null;

  return (
    <div style={{ position: 'fixed', bottom: 30, right: 30, zIndex: 9999, fontFamily: 'sans-serif' }}>
      {!isOpen && (
        <button 
          className="btn btn-primary rounded-circle shadow-lg d-flex align-items-center justify-content-center"
          style={{ width: 60, height: 60, fontSize: 30, border: 'none' }}
          onClick={() => setIsOpen(true)}
        >
          💬
        </button>
      )}

      {isOpen && (
        <div className="card shadow-lg border-0" style={{ width: 360, height: 500, display: 'flex', flexDirection: 'column', borderRadius: 12, overflow: 'hidden' }}>
          <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center py-3">
            <div className="d-flex align-items-center gap-2">
              <span style={{ fontSize: 20 }}>🤖</span>
              <span className="fw-bold">Trợ lý ảo AI</span>
            </div>
            <button className="btn-close btn-close-white" onClick={() => setIsOpen(false)} aria-label="Close"></button>
          </div>
          
          <div className="card-body p-3" style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f3f4f6' }}>
            {messages.map((m, idx) => (
              <div key={idx} className={`d-flex mb-3 ${m.role === 'user' ? 'justify-content-end' : 'justify-content-start'}`}>
                <div 
                  className={`p-2 px-3 rounded-3 shadow-sm ${m.role === 'user' ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
                  style={{ maxWidth: '85%', wordWrap: 'break-word', fontSize: '0.95rem', whiteSpace: 'pre-wrap' }}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && <div className="text-secondary small ms-2 fst-italic">AI đang xử lý...</div>}
            <div ref={endRef} />
          </div>

          <div className="card-footer p-2 bg-white">
            <div className="input-group">
              <input 
                className="form-control border-0 bg-light" 
                placeholder="Nhập yêu cầu..." 
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                disabled={loading}
                autoFocus
              />
              <button className="btn btn-primary" onClick={handleSend} disabled={loading}>Gửi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}