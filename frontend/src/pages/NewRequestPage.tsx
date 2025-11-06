import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 👈 Import useNavigate
import { request as apiRequest } from '../api/request';
import { apiCreateRequest } from '../api/requests';
import { apiSuggestKnowledge, apiCompleteText, KnowledgeSuggestion } from '../api/ai';

type SelectOption = { value: string; label: string };

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
  optionsUrlTemplate: string;
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

type Room = { key: string; name: string; size: 'SMALL' | 'LARGE' };

export default function NewRequestPage() {
  const navigate = useNavigate(); // 👈 Khởi tạo hook điều hướng
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

  const [aiSuggestions, setAiSuggestions] = useState<KnowledgeSuggestion[]>([]);
  const [completing, setCompleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token') || '');
  }, []);

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

  function toISO(v: string): string {
    return v ? new Date(v).toISOString() : '';
  }

  const current = useMemo(
    () => catalog.find((c) => c.typeKey === form.typeKey),
    [catalog, form.typeKey],
  );

  // AI Suggestion
  useEffect(() => {
    if (!token || form.category !== 'IT' || !form.title || form.title.trim().length < 3) {
      setAiSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await apiSuggestKnowledge(token, form.title);
        setAiSuggestions(res.filter((s) => s.score > 0.3).slice(0, 3));
      } catch (e) { /* ignore */ }
    }, 500);
    return () => clearTimeout(timer);
  }, [token, form.category, form.title]);

  // AI Complete
  const onAiComplete = async () => {
    if (!token || !form.description.trim()) return;
    setCompleting(true);
    try {
      const res = await apiCompleteText(token, form.description);
      if (res.completed) {
        setForm((prev) => ({ ...prev, description: prev.description + res.completed }));
      }
    } catch (e) {
      alert('AI không phản hồi, vui lòng thử lại sau.');
    } finally {
      setCompleting(false);
    }
  };

  // Load catalog
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
  }, [token, form.category]);

  // Load dynamic fields
  useEffect(() => {
    if (!token || !current) return;
    let cancelled = false;

    const fetchField = async (f: CatalogField) => {
      if (f.type !== 'select' || !(f as DynamicSelectField).optionsUrlTemplate) return;

      const url = buildUrlFromTemplate((f as DynamicSelectField).optionsUrlTemplate);

      if (/\{[^}]+\}/.test(url)) {
        setRemoteOptions((prev) => ({ ...prev, [f.key]: [] }));
        return;
      }

      try {
        setLoadingRemote((prev) => ({ ...prev, [f.key]: true }));
        const data = await apiRequest<Array<Room | { key?: string; name?: string; value?: string; label?: string }>>(
          url,
          { method: 'GET' },
          token,
        );
        if (cancelled) return;

        const mapped: SelectOption[] = (data || []).map((d: any) => ({
          value: String(d.value ?? d.key ?? ''),
          label: String(d.label ?? d.name ?? d.value ?? d.key ?? ''),
        }));

        setRemoteOptions((prev) => ({ ...prev, [f.key]: mapped }));

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
  }, [token, current, form.typeKey, form.custom?.start, form.custom?.end, form.custom?.size]);

  // --- SUBMIT FORM ---
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

      // --- FIX: Thông báo và tự động chuyển hướng ---
      alert('✅ Tạo yêu cầu thành công! Đang chuyển về danh sách...');
      navigate('/requests/mine'); // Chuyển hướng về trang danh sách
      // ---------------------------------------------

    } catch (err: any) {
      const text = err?.message || 'Không thể tạo yêu cầu. Vui lòng thử lại.';
      setMsg({ type: 'error', text });
      setLoading(false);
    }
  };

  return (
    <div className="container py-3">
      <h3 className="mb-3">Tạo yêu cầu</h3>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`} role="alert">
          {msg.text}
        </div>
      )}

      <div className="row mb-3">
        <div className="col-md-6">
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

        <div className="col-md-6">
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
      </div>

      {current && (
        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label">Tiêu đề</label>
            <input
              className="form-control"
              value={form.title}
              onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
              placeholder={current.title}
            />
            {aiSuggestions.length > 0 && (
              <div className="alert alert-info mt-2 mb-0 p-2" style={{ fontSize: '0.9rem' }}>
                <strong>💡 Gợi ý từ AI:</strong>
                <ul className="mb-0 ps-3">
                  {aiSuggestions.map((s) => (
                    <li key={s.id}>
                      <strong>{s.title}:</strong> {s.suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {current.fields.map((f) => {
            if (f.type === 'select') {
              const dynTpl = (f as DynamicSelectField).optionsUrlTemplate;
              const isDynamic = typeof dynTpl === 'string' && dynTpl.length > 0;
              const options: SelectOption[] = isDynamic
                ? remoteOptions[f.key] || []
                : (f as StaticSelectField).options;

              const isLoading = !!loadingRemote[f.key];

              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
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
                      Không có lựa chọn phù hợp.
                    </div>
                  )}
                </div>
              );
            }

            const commonProps = {
              className: 'form-control',
              required: !!f.required,
              value: form.custom?.[f.key] ?? '',
              onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setForm((old) => ({ ...old, custom: { ...old.custom, [f.key]: e.target.value } })),
            };

            if (f.type === 'datetime') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                  <input type="datetime-local" {...commonProps} />
                </div>
              );
            }
            if (f.type === 'date') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                  <input type="date" {...commonProps} />
                </div>
              );
            }
            if (f.type === 'number') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                  <input type="number" {...commonProps} />
                </div>
              );
            }
            if (f.type === 'text') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                  <input type="text" {...commonProps} />
                </div>
              );
            }
            if (f.type === 'textarea') {
              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                  <textarea rows={3} {...commonProps} />
                </div>
              );
            }

            return null;
          })}

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

          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label className="form-label mb-0">Mô tả</label>
              
            </div>
            <textarea
              className="form-control"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((old) => ({ ...old, description: e.target.value }))}
              placeholder="Nhập mô tả chi tiết..."
            />
          </div>

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