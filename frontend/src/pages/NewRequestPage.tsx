// frontend/src/pages/NewRequestPage.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetCatalog, type CatalogItem } from '../api/catalog';
import { apiCreateRequest, type RequestCategory, type RequestPriority } from '../api/requests';
import RequestDynamicFields from '../components/RequestDynamicFields';

export default function NewRequestPage() {
  const { token } = useAuth();

  // Chọn danh mục/loại
  const [category, setCategory] = useState<RequestCategory | ''>('');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [typeKey, setTypeKey] = useState<string>('');

  // Trường cơ bản
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<RequestPriority>('LOW');

  // Trường động
  const [custom, setCustom] = useState<Record<string, any>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string | undefined>>({});

  // Files
  const [files, setFiles] = useState<File[]>([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const canLoadCatalog = useMemo(() => Boolean(token && category), [token, category]);

  const selectedType: CatalogItem | undefined = useMemo(
    () => catalog.find((c) => c.typeKey === typeKey),
    [catalog, typeKey]
  );

  // Tải catalog khi chọn danh mục
  useEffect(() => {
    let aborted = false;
    async function load() {
      setCatalog([]);
      setTypeKey('');
      setCustom({});
      setFieldErrors({});
      setOk(null);
      setError(null);

      if (!canLoadCatalog) return;
      setLoading(true);
      try {
        const items = await apiGetCatalog(token!, category as RequestCategory);
        if (aborted) return;

        setCatalog(items);
        setTypeKey(items[0]?.typeKey ?? '');
        // reset custom theo fields đầu tiên (nếu có)
        const first = items[0];
        if (first?.fields?.length) {
          const init: Record<string, any> = {};
          first.fields.forEach((f) => { init[f.key] = ''; });
          setCustom(init);
        }
      } catch (e: any) {
        if (aborted) return;
        setError(e?.message ?? 'Không tải được danh mục');
      } finally {
        if (!aborted) setLoading(false);
      }
    }
    load();
    return () => { aborted = true; };
  }, [canLoadCatalog, token, category]);

  // Khi đổi typeKey → reset custom theo fields mới
  useEffect(() => {
    if (!selectedType) { setCustom({}); setFieldErrors({}); return; }
    const init: Record<string, any> = {};
    selectedType.fields.forEach((f) => { init[f.key] = ''; });
    setCustom(init);
    setFieldErrors({});
  }, [selectedType?.typeKey]);

  function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const list = e.target.files ? Array.from(e.target.files) : [];
    setFiles(list);
  }

  function validate(): boolean {
    const errs: Record<string, string | undefined> = {};

    if (!category) {
      setError('Vui lòng chọn danh mục');
      return false;
    }
    if (!typeKey) {
      setError('Vui lòng chọn loại');
      return false;
    }
    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề');
      return false;
    }

    if (selectedType?.fields?.length) {
      for (const f of selectedType.fields) {
        const v = custom?.[f.key];
        if (f.required) {
          if (f.type === 'select') {
            if (!v) errs[f.key] = 'Bắt buộc chọn';
          } else if (v === undefined || v === null || v === '') {
            errs[f.key] = 'Bắt buộc nhập';
          }
        }
      }
    }

    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      setError('Vui lòng điền đủ các trường bắt buộc');
      return false;
    }
    setError(null);
    return true;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setOk(null);

    if (!token) {
      setError('Bạn cần đăng nhập');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);
    try {
      await apiCreateRequest(token, {
        category: category as RequestCategory,
        typeKey,
        title: title.trim(),
        description: description.trim(),
        priority,
        custom,            // gửi object; apiCreateRequest sẽ stringify trong FormData
        files,
      });
      setOk('Tạo yêu cầu thành công');
      // reset form (giữ lại category để tiếp tục tạo nhanh)
      setTitle('');
      setDescription('');
      setPriority('LOW');
      setFiles([]);
      // reset trường động theo type hiện tại
      const next: Record<string, any> = {};
      selectedType?.fields.forEach((f) => { next[f.key] = ''; });
      setCustom(next);
    } catch (e: any) {
      setError(e?.message ?? 'Tạo yêu cầu thất bại');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container py-4">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="m-0">Tạo yêu cầu</h3>
      </div>

      {ok && <div className="alert alert-success">{ok}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={onSubmit} className="row g-3">
        {/* Danh mục */}
        <div className="col-md-4">
          <label className="form-label">Danh mục</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as RequestCategory | '')}
            disabled={submitting}
          >
            <option value="">-- chọn --</option>
            <option value="HR">HR</option>
            <option value="IT">IT</option>
          </select>
        </div>

        {/* Loại */}
        <div className="col-md-8">
          <label className="form-label">Loại</label>
          <select
            className="form-select"
            value={typeKey}
            onChange={(e) => setTypeKey(e.target.value)}
            disabled={!category || loading || submitting || catalog.length === 0}
          >
            {!category && <option>Chọn danh mục trước</option>}
            {category && catalog.length === 0 && !loading && <option>Không có loại nào</option>}
            {catalog.map((c) => (
              <option key={c.typeKey} value={c.typeKey}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* Tiêu đề / Mô tả / Ưu tiên */}
        <div className="col-md-6">
          <label className="form-label">Tiêu đề</label>
          <input
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
            required
          />
        </div>
        <div className="col-md-6">
          <label className="form-label">Ưu tiên</label>
          <select
            className="form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
            disabled={submitting}
          >
            <option value="LOW">Thấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HIGH">Cao</option>
            <option value="URGENT">Khẩn</option>
          </select>
        </div>
        <div className="col-12">
          <label className="form-label">Mô tả</label>
          <textarea
            className="form-control"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        {/* Trường động theo loại */}
        {selectedType && (
          <div className="col-12">
            <div className="border rounded p-3">
              <div className="mb-2 fw-semibold">Thông tin bổ sung</div>
              <RequestDynamicFields
                fields={selectedType.fields}
                value={custom}
                onChange={setCustom}
                disabled={submitting}
                errors={fieldErrors}
              />
            </div>
          </div>
        )}

        {/* Files */}
        <div className="col-12">
          <label className="form-label">Đính kèm (tối đa 5 file)</label>
          <input
            className="form-control"
            type="file"
            multiple
            onChange={onPickFiles}
            disabled={submitting}
          />
          {files.length > 0 && (
            <div className="form-text">{files.length} file đã chọn</div>
          )}
        </div>

        <div className="col-12">
          <button className="btn btn-primary" type="submit" disabled={submitting || !category || !typeKey}>
            {submitting ? 'Đang tạo...' : 'Tạo yêu cầu'}
          </button>
        </div>
      </form>
    </div>
  );
}
