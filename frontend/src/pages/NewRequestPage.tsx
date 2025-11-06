// frontend/src/pages/NewRequestPage.tsx
// Sử dụng fetch wrapper của bạn: request.ts + requests.ts (không dùng axios)
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { request as apiRequest } from '../api/request';
import { apiCreateRequest } from '../api/requests';

type SelectOption = { value: string; label: string };

// ====== Kiểu dữ liệu khớp với backend/src/catalog/catalog.data.ts ======
type StaticSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  options: SelectOption[];
};

type DynamicSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  optionsUrlTemplate: string; // ví dụ: /requests/available-rooms?start={custom.start}&end={custom.end}&size={custom.size}
};

type BaseField =
  | { key: string; label: string; type: 'text' | 'textarea' | 'date' | 'number' | 'datetime'; required?: boolean };

type CatalogField = BaseField | StaticSelectField | DynamicSelectField;

type CatalogItem = {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  fields: CatalogField[];
};

// Trả về từ /requests/available-rooms
type Room = { key: string; name: string; size: 'SMALL' | 'LARGE' };

export default function NewRequestPage() {
  const [token, setToken] = useState<string>('');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState<{
    category: 'HR' | 'IT';
    typeKey: string;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    custom: Record<string, any>;
  }>({
    category: 'HR',
    typeKey: '',
    title: '',
    description: '',
    priority: 'MEDIUM',
    custom: {},
  });

  const [remoteOptions, setRemoteOptions] = useState<Record<string, SelectOption[]>>({});
  const [loadingRemote, setLoadingRemote] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token') || '');
  }, []);

  // Helper: build URL từ template (thay {custom.xxx}, {title}, {category}, {typeKey})
  function buildUrlFromTemplate(tpl: string): string {
    return tpl.replace(/\{([^}]+)\}/g, (_m, expr: string) => {
      try {
        if (expr.startsWith('custom.')) {
          const k = expr.slice('custom.'.length);
          return encodeURIComponent(form.custom?.[k] ?? '');
        }
        return encodeURIComponent((form as any)[expr] ?? '');
      } catch {
        return '';
      }
    });
  }

  // Helper: chuyển datetime-local -> ISO
  function toISO(v: string): string {
    return v ? new Date(v).toISOString() : '';
  }

  const current = useMemo(
    () => catalog.find((c) => c.typeKey === form.typeKey),
    [catalog, form.typeKey],
  );

  // Tải catalog theo category
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiRequest<CatalogItem[]>(
          `/catalog?category=${form.category}`,
          { method: 'GET' },
          token,
        );
        if (cancelled) return;

        setCatalog(data || []);

        // Nếu typeKey hiện tại không thuộc category mới -> reset chọn mẫu đầu tiên
        if (!data?.find((x) => x.typeKey === form.typeKey)) {
          const first = data?.[0];
          setForm((old) => ({
            ...old,
            typeKey: first?.typeKey ?? '',
            title: first?.title ?? '',
            custom: {},
            description: '',
          }));
          setRemoteOptions({});
        }
      } catch (e: any) {
        setCatalog([]);
        setMsg({ type: 'error', text: e?.message || 'Không tải được catalog' });
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, form.category]);

  // Fetch options động cho các field có optionsUrlTemplate
  useEffect(() => {
    if (!token || !current) return;
    let cancelled = false;

    const fetchField = async (f: CatalogField) => {
      if (f.type !== 'select' || !(f as DynamicSelectField).optionsUrlTemplate) return;

      const url = buildUrlFromTemplate((f as DynamicSelectField).optionsUrlTemplate);

      // Nếu còn placeholder -> chưa đủ dữ liệu
      if (/\{[^}]+\}/.test(url)) {
        setRemoteOptions((prev) => ({ ...prev, [f.key]: [] }));
        return;
      }

      try {
        setLoadingRemote((prev) => ({ ...prev, [f.key]: true }));
        // Với API /requests/available-rooms, kết quả là Room[]
        const data = await apiRequest<Array<Room | { key?: string; name?: string; value?: string; label?: string }>>(
          url,
          { method: 'GET' },
          token,
        );
        if (cancelled) return;

        // Chuẩn hoá về SelectOption
        const mapped: SelectOption[] = (data || []).map((d: any) => ({
          value: String(d.value ?? d.key ?? ''),
          label: String(d.label ?? d.name ?? d.value ?? d.key ?? ''),
        }));

        setRemoteOptions((prev) => ({ ...prev, [f.key]: mapped }));

        // Nếu giá trị hiện tại không còn hợp lệ -> reset
        if (form.custom?.[f.key] && !mapped.find((m) => m.value === form.custom[f.key])) {
          setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: '' } }));
        }
      } catch (err) {
        setRemoteOptions((prev) => ({ ...prev, [f.key]: [] }));
      } finally {
        setLoadingRemote((prev) => ({ ...prev, [f.key]: false }));
      }
    };

    (async () => {
      for (const f of current.fields) {
        await fetchField(f);
      }
    })();

    return () => {
      cancelled = true;
    };
    // phụ thuộc: typeKey + các custom fields ảnh hưởng template (thường: start/end/size)
  }, [token, current, form.typeKey, form.custom?.start, form.custom?.end, form.custom?.size]); // eslint-disable-line

  // Submit
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!token) {
      setMsg({ type: 'error', text: 'Bạn chưa đăng nhập.' });
      return;
    }

    setLoading(true);

    try {
      const normalizedCustom = { ...form.custom };
      if (normalizedCustom.start) normalizedCustom.start = toISO(normalizedCustom.start);
      if (normalizedCustom.end) normalizedCustom.end = toISO(normalizedCustom.end);

      const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : [];

      await apiCreateRequest(token, {
        category: form.category,
        typeKey: form.typeKey,
        title: form.title || current?.title || '',
        description: form.description || '',
        priority: form.priority,
        custom: normalizedCustom,
        files,
      });

      setMsg({ type: 'success', text: 'Tạo yêu cầu thành công!' });

      // reset form tối thiểu
      setForm((old) => ({
        ...old,
        title: current?.title ?? '',
        description: '',
        custom: {},
      }));
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      const text = err?.message || 'Không thể tạo yêu cầu. Vui lòng thử lại.';
      setMsg({ type: 'error', text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-3">
      <h3 className="mb-3">Tạo yêu cầu</h3>

      {/* Alerts */}
      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {msg.text}
        </div>
      )}

      {/* Category */}
      <div className="mb-3">
        <label className="form-label">Danh mục</label>
        <select
          className="form-select"
          value={form.category}
          onChange={(e) =>
            setForm((old) => ({
              ...old,
              category: e.target.value as 'HR' | 'IT',
              typeKey: '',
              title: '',
              custom: {},
              description: '',
            }))
          }
        >
          <option value="HR">HR</option>
          <option value="IT">IT</option>
        </select>
      </div>

      {/* TypeKey */}
      <div className="mb-3">
        <label className="form-label">Loại yêu cầu</label>
        <select
          className="form-select"
          value={form.typeKey}
          onChange={(e) => {
            const tk = e.target.value;
            const found = catalog.find((c) => c.typeKey === tk);
            setForm((old) => ({
              ...old,
              typeKey: tk,
              title: found?.title ?? '',
              custom: {},
            }));
            setRemoteOptions({});
          }}
        >
          <option value="">-- Chọn --</option>
          {catalog.map((c) => (
            <option key={c.typeKey} value={c.typeKey}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Form fields */}
      {current && (
        <form onSubmit={onSubmit}>
          {/* Title */}
          <div className="mb-3">
            <label className="form-label">Tiêu đề</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
              placeholder={current.title}
            />
          </div>

          {current.fields.map((f) => {
            // SELECT (static / dynamic)
            if (f.type === 'select') {
              const dynTpl = (f as DynamicSelectField).optionsUrlTemplate;
              const isDynamic = typeof dynTpl === 'string' && dynTpl.length > 0;
              const options: SelectOption[] = isDynamic
                ? remoteOptions[f.key] || []
                : (f as StaticSelectField).options;

              const isLoading = !!loadingRemote[f.key];

              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <select
                    className="form-select"
                    required={!!f.required}
                    value={form.custom?.[f.key] ?? ''}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } }))
                    }
                    disabled={isDynamic && (isLoading || options.length === 0)}
                  >
                    <option value="">
                      {isDynamic ? (isLoading ? 'Đang tải...' : '-- Chọn --') : '-- Chọn --'}
                    </option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  {isDynamic && !isLoading && options.length === 0 && (
                    <div className="form-text text-danger">
                      Không có lựa chọn phù hợp (có thể chưa chọn đủ thông tin hoặc không còn phòng trống).
                    </div>
                  )}
                </div>
              );
            }

            // DATETIME
            if (f.type === 'datetime') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    required={!!f.required}
                    value={form.custom?.[f.key] ?? ''}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } }))
                    }
                  />
                </div>
              );
            }

            // DATE
            if (f.type === 'date') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input
                    type="date"
                    className="form-control"
                    required={!!f.required}
                    value={form.custom?.[f.key] ?? ''}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } }))
                    }
                  />
                </div>
              );
            }

            // NUMBER
            if (f.type === 'number') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input
                    type="number"
                    className="form-control"
                    required={!!f.required}
                    value={form.custom?.[f.key] ?? ''}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } }))
                    }
                  />
                </div>
              );
            }

            // TEXT
            if (f.type === 'text') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <input
                    type="text"
                    className="form-control"
                    required={!!f.required}
                    value={form.custom?.[f.key] ?? ''}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } }))
                    }
                  />
                </div>
              );
            }

            // TEXTAREA
            if (f.type === 'textarea') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label}</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    required={!!f.required}
                    value={form.custom?.[f.key] ?? ''}
                    onChange={(e) =>
                      setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } }))
                    }
                  />
                </div>
              );
            }

            return null;
          })}

          {/* Priority */}
          <div className="mb-3">
            <label className="form-label">Mức độ ưu tiên</label>
            <select
              className="form-select"
              value={form.priority}
              onChange={(e) =>
                setForm((old) => ({
                  ...old,
                  priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
                }))
              }
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="form-label">Mô tả</label>
            <textarea
              className="form-control"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}
            />
          </div>

          {/* Attachments */}
          <div className="mb-3">
            <label className="form-label">Tệp đính kèm</label>
            <input ref={fileInputRef} type="file" multiple className="form-control" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading || !token}>
            {loading ? 'Đang gửi...' : 'Gửi yêu cầu'}
          </button>
        </form>
      )}
    </div>
  );
}
