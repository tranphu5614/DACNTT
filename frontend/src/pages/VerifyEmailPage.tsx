import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// Đảm bảo URL này trỏ đúng Backend của bạn
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const VerifyEmailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMsg('Không tìm thấy mã xác thực.');
      return;
    }

    const verify = async () => {
      try {
        await axios.get(`${API_URL}/auth/verify-email?token=${token}`);
        setStatus('success');
        // Chuyển hướng về login sau 5 giây
        setTimeout(() => navigate('/login'), 5000);
      } catch (err: any) {
        setStatus('error');
        setMsg(err.response?.data?.message || 'Xác thực thất bại.');
      }
    };

    verify();
  }, [token, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
        {status === 'loading' && (
          <div className="text-blue-600 font-bold text-xl">Đang xử lý xác thực...</div>
        )}

        {status === 'success' && (
          <div>
            <div className="text-green-500 text-5xl mb-4">✔</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thành công!</h2>
            <p className="text-gray-600 mb-4">Tài khoản của bạn đã được kích hoạt.</p>
            <p className="text-sm text-gray-500">Đang chuyển hướng về trang đăng nhập...</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Đăng nhập ngay
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="text-red-500 text-5xl mb-4">✘</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Xác thực thất bại</h2>
            <p className="text-red-600 mb-4">{msg}</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Về trang đăng nhập
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;