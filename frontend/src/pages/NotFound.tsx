import { Link } from 'react-router-dom';
export default function NotFound() {
  return (
    <div className="center">
      <div className="card">
        <h2>404 - Not Found</h2>
        <Link to="/">Về trang chủ</Link>
      </div>
    </div>
  );
}
