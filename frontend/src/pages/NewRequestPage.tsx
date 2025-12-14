import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request as apiRequest } from '../api/request';
import { apiCreateRequest } from '../api/requests';
import { apiSuggestKnowledge, KnowledgeSuggestion } from '../api/ai';

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

export default function NewRequestPage() {
  const navigate = useNavigate();

  const [token, setToken] = useState('');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [form, setForm] = useState({
    category: 'HR' as 'HR' | 'IT',
    typeKey: '',
    title: '',
    custom: {} as Record<string, any>,
  });

  const [remoteOptions, setRemoteOptions] = useState<Record<string, SelectOption[]>>({});
  const [loadingRemote, setLoadingRemote] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [aiSuggestions, setAiSuggestions] = useState<KnowledgeSuggestion[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setToken(localStorage.getItem('token') || '');
  }, []);

  function buildUrlFromTemplate(tpl: string): string {
    return tpl.replace(/\{([^}]+)\}/g, (_m, expr: string) => {
      try {
        if (expr.startsWith('custom.')) {
          const key = expr.replace('custom.', '');
          return encodeURIComponent(form.custom[key] ?? '');
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

  const current = useMemo(() => {
    return catalog.find((c) => c.typeKey === form.typeKey) || null;
  }, [catalog, form.typeKey]);
  // AI Suggestion
  useEffect(() => {
    if (!token || form.category !== 'IT' || !form.title.trim() || form.title.length < 3) {
      setAiSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await apiSuggestKnowledge(token, form.title);
        setAiSuggestions(res.filter((s) => s.score > 0.3).slice(0, 3));
      } catch {}
    }, 500);

    return () => clearTimeout(timer);
  }, [token, form.category, form.title]);

  // LOAD catalog (FIX find + undefined)
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const data = (await apiRequest(`/catalog?category=${form.category}`, { method: 'GET' }, token)) as
          | CatalogItem[]
          | undefined;

        if (cancelled) return;

        const list = data ?? [];
        setCatalog(list); // FIX setCatalog

        const exists = list.find((x) => x.typeKey === form.typeKey);

        if (!exists) {
          const first = list[0];
          setForm((old) => ({
            ...old,
            typeKey: first?.typeKey ?? '',
            title: first?.title ?? '',
            custom: {},
          }));
          setRemoteOptions({});
        }
      } catch (e: any) {
        setCatalog([]);
        setMsg({ type: 'error', text: e?.message ?? 'Không tải được catalog' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, form.category]);

  // Dynamic Select Loader (FIX map)
  useEffect(() => {
    if (!token || !current) return;
    let cancelled = false;

    const fetchField = async (f: CatalogField) => {
      if (f.type !== 'select' || !(f as DynamicSelectField).optionsUrlTemplate) return;

      const url = buildUrlFromTemplate((f as DynamicSelectField).optionsUrlTemplate);

      if (/\{[^}]+\}/.test(url)) {
        setRemoteOptions((p) => ({ ...p, [f.key]: [] }));
        return;
      }

      try {
        setLoadingRemote((p) => ({ ...p, [f.key]: true }));
        const raw = (await apiRequest(url, { method: 'GET' }, token)) as any[] | undefined;

        if (cancelled) return;

        const mapped = (raw ?? []).map((d: any) => ({
          value: String(d.value ?? d.key ?? ''),
          label: String(d.label ?? d.name ?? d.value ?? d.key ?? ''),
        }));

        setRemoteOptions((p) => ({ ...p, [f.key]: mapped }));

      } catch {
        setRemoteOptions((p) => ({ ...p, [f.key]: [] }));
      } finally {
        setLoadingRemote((p) => ({ ...p, [f.key]: false }));
      }
    };

    (async () => {
      for (const f of current.fields) await fetchField(f);
    })();

    return () => {
      cancelled = true;
    };
  }, [token, current, form.custom?.start, form.custom?.end, form.custom?.size]);

  // SUBMIT
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!token) return setMsg({ type: 'error', text: 'Bạn chưa đăng nhập.' });

    setLoading(true);

    try {
      const custom = { ...form.custom };
      if (custom.start) custom.start = toISO(custom.start);
      if (custom.end) custom.end = toISO(custom.end);

      const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : [];

      await apiCreateRequest(token, {
        category: form.category,
        typeKey: form.typeKey,
        title: form.title || current?.title || '',
        description: '',
        priority: '',
        custom,
        files,
      });

      alert('✅ Tạo yêu cầu thành công!');
      navigate('/requests/mine');

    } catch (e: any) {
      setMsg({ type: 'error', text: e?.message || 'Không thể tạo yêu cầu.' });
      setLoading(false);
    }
  };
  return (
    <div className="page" style={{ maxWidth: 760, margin: '0 auto' }}>
      <h2 className="fw-bold mb-1">Tạo yêu cầu mới</h2>
      <p className="text-muted small mb-3">Hãy điền đầy đủ thông tin</p>

      {msg && (
        <div className={`alert ${msg.type === 'success' ? 'alert-success' : 'alert-danger'}`}>
          {msg.text}
        </div>
      )}

      <div className="card p-4 shadow-sm" style={{ borderRadius: 16 }}>
        <div className="row">
          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">Danh mục</label>
            <select
              className="form-select"
              value={form.category}
              onChange={(e) =>
                setForm({
                  category: e.target.value as 'HR' | 'IT',
                  typeKey: '',
                  title: '',
                  custom: {},
                })
              }
            >
              <option value="HR">HR</option>
              <option value="IT">IT</option>
            </select>
          </div>

          <div className="col-md-6 mb-3">
            <label className="form-label fw-semibold">Loại yêu cầu</label>
            <select
              className="form-select"
              value={form.typeKey}
              onChange={(e) => {
                const tk = e.target.value;
                const found = catalog.find((c) => c.typeKey === tk);
                setForm({
                  ...form,
                  typeKey: tk,
                  title: found?.title ?? '',
                  custom: {},
                });
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
              <label className="form-label fw-semibold">
                Tiêu đề <span className="text-danger">*</span>
              </label>
              <input
                className="form-control"
                required
                placeholder={current.title}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <div className="form-text">Hệ thống sẽ tự động phân tích mức độ ưu tiên.</div>

              {aiSuggestions.length > 0 && (
                <div className="alert alert-info mt-2 py-2">
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
                const options = remoteOptions[f.key] || [];
                const isLoading = loadingRemote[f.key];

                return (
                  <div className="mb-3" key={f.key}>
                    <label className="form-label fw-semibold">
                      {f.label} {f.required && <span className="text-danger">*</span>}
                    </label>

                    <select
                      className="form-select"
                      required={f.required}
                      disabled={isLoading || options.length === 0}
                      value={form.custom[f.key] ?? ''}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          custom: { ...form.custom, [f.key]: e.target.value },
                        })
                      }
                    >
                      <option value="">
                        {isLoading ? 'Đang tải...' : '-- Chọn --'}
                      </option>
                      {options.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              const common = {
                className: 'form-control',
                required: f.required,
                value: form.custom[f.key] ?? '',
                onChange: (e: any) =>
                  setForm({
                    ...form,
                    custom: { ...form.custom, [f.key]: e.target.value },
                  }),
              };

              return (
                <div className="mb-3" key={f.key}>
                  <label className="form-label fw-semibold">
                    {f.label} {f.required && <span className="text-danger">*</span>}
                  </label>

                  {f.type === 'textarea' ? <textarea rows={3} {...common} /> : <input type={f.type} {...common} />}
                </div>
              );
            })}

            <div className="mb-4">
              <label className="form-label fw-semibold">Tệp đính kèm</label>
              <input ref={fileInputRef} type="file" multiple className="form-control" />
            </div>

            <button className="btn btn-primary btn-lg w-100" disabled={loading}>
              {loading ? 'Đang gửi...' : '🚀 Gửi yêu cầu'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
