import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request as apiRequest } from '../api/request';
import { apiCreateRequest } from '../api/requests';
import { apiSuggestKnowledge, KnowledgeSuggestion } from '../api/ai';
import {
  CatalogItem,
  DynamicSelectField,
  StaticSelectOption,
  CatalogField,
  RoomSelectorField,
} from '../api/catalog';
import RequestDynamicFields from '../components/RequestDynamicFields';

type SelectOption = StaticSelectOption;

// [CẬP NHẬT] Xóa trường description khỏi State
type FormState = {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  custom: Record<string, any>;
};

export default function NewRequestPage() {
  const navigate = useNavigate();
  const [token, setToken] = useState<string>('');
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  
  const [form, setForm] = useState<FormState>({
    category: 'HR',
    typeKey: '',
    title: '',
    custom: {},
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

  // Hàm thay thế biến trong URL template
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

  // Convert sang ISO string
  function toISO(v: string): string {
    if (v && v.includes('T')) {
        const [datePart, timePart] = v.split('T');
        return new Date(`${datePart}T${timePart}:00`).toISOString();
    }
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

  // Load Catalog
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

        // Reset form nếu typeKey hiện tại không khớp
        if (!data?.find((x) => x.typeKey === form.typeKey)) {
          const first = data?.[0];
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
        setMsg({ type: 'error', text: e?.message || 'Không tải được catalog' });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, form.category]);

  // Load Dynamic Fields
  useEffect(() => {
    if (!token || !current) return;
    let cancelled = false;

    const fetchField = async (f: CatalogField) => {
      if ((f.type !== 'select' && f.type !== 'room_selector') || !('optionsUrlTemplate' in f)) return;
      
      const dynField = f as DynamicSelectField | RoomSelectorField;
      const url = buildUrlFromTemplate(dynField.optionsUrlTemplate);

      if (/[^a-zA-Z0-9]\{[^}]+?\}/.test(url)) {
        setRemoteOptions((prev) => ({ ...prev, [f.key]: [] }));
        return;
      }

      try {
        setLoadingRemote((prev) => ({ ...prev, [f.key]: true }));
        const data = await apiRequest<Array<{ key?: string; name?: string; value?: string; label?: string; isBusy?: boolean }>>(
          url,
          { method: 'GET' },
          token,
        );
        if (cancelled) return;

        const mapped: SelectOption[] = (data || []).map((d: any) => ({
          value: String(d.value ?? d.key ?? ''),
          label: String(d.label ?? d.name ?? d.value ?? d.key ?? ''),
          isBusy: !!d.isBusy,
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
        if ((f.type === 'select' || f.type === 'room_selector') && 'optionsUrlTemplate' in f) {
          await fetchField(f);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, current, form.typeKey, JSON.stringify(form.custom)]);

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
      let derivedStart = undefined;
      let derivedEnd = undefined;

      // Logic ghép giờ đặt phòng
      if (form.typeKey === 'meeting_room_booking') {
          const { bookingDate, fromTime, toTime } = normalizedCustom;
          if (bookingDate && fromTime && toTime) {
              derivedStart = new Date(`${bookingDate}T${fromTime}:00`).toISOString();
              derivedEnd = new Date(`${bookingDate}T${toTime}:00`).toISOString();
          }
      } else {
          // Logic chuẩn hóa ngày tháng
          current?.fields.forEach(f => {
            if (f.key in normalizedCustom && (f.type === 'date' || f.type === 'datetime') && normalizedCustom[f.key]) {
                normalizedCustom[f.key] = toISO(normalizedCustom[f.key]);
            }
          });
      }
      
      const files = fileInputRef.current?.files ? Array.from(fileInputRef.current.files) : [];

      await apiCreateRequest(token, {
        category: form.category,
        typeKey: form.typeKey,
        title: form.title || current?.title || '',
        description: '', // [QUAN TRỌNG] Gửi chuỗi rỗng vì đã xóa UI
        priority: '',    
        custom: normalizedCustom,
        bookingStart: derivedStart, 
        bookingEnd: derivedEnd,
        bookingRoomKey: normalizedCustom.roomKey,
        files,
      });

      alert('✅ Tạo yêu cầu thành công! Đang chuyển về danh sách...');
      navigate('/requests/mine');

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

      {/* SELECTORS */}
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
          {/* TIÊU ĐỀ */}
          <div className="mb-3">
            <label className="form-label">Tiêu đề <span className="text-danger">*</span></label>
            <input
              className="form-control"
              required
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

          {/* [ĐÃ XÓA] Ô nhập Description */}

          {/* FORM ĐỘNG */}
          <RequestDynamicFields
            fields={current.fields}
            value={form.custom}
            onChange={(custom) => setForm((old) => ({ ...old, custom }))}
            disabled={loading}
            dynamicOptions={remoteOptions}
            loadingRemote={loadingRemote}
          />

          {/* FILE UPLOAD */}
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