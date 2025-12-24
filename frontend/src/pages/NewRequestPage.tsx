import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [aiSuggestions, setAiSuggestions] = useState<KnowledgeSuggestion[]>([]);
  
  const [isSingleDay, setIsSingleDay] = useState(false);

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

  const { visibleFields, endDateKey, startDateKey } = useMemo(() => {
      if (!current) return { visibleFields: [], endDateKey: null, startDateKey: null };

      const dateFields = current.fields.filter(f => f.type === 'date' || f.type === 'datetime');
      
      let eKey = null;
      let sKey = null;
      
      if (dateFields.length >= 2) {
          sKey = dateFields[0].key;
          eKey = dateFields[1].key;
      }

      const vFields = current.fields.filter(f => {
          if (isSingleDay && eKey && f.key === eKey) return false;
          return true;
      });

      return { visibleFields: vFields, endDateKey: eKey, startDateKey: sKey };
  }, [current, isSingleDay]);


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
          }));
          setRemoteOptions({});
          setIsSingleDay(false); 
        }
      } catch (e: any) {
        setCatalog([]);
        alert(e?.message || 'Không tải được catalog');
      }
    })();
    return () => { cancelled = true; };
  }, [token, form.category]);

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
          url, { method: 'GET' }, token,
        );
        if (cancelled) return;
        const mapped: SelectOption[] = (data || []).map((d: any) => ({
          value: String(d.value ?? d.key ?? ''),
          label: String(d.label ?? d.name ?? d.value ?? d.key ?? ''),
          isBusy: !!d.isBusy,
        }));
        setRemoteOptions((prev) => ({ ...prev, [f.key]: mapped }));
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
    return () => { cancelled = true; };
  }, [token, current, form.typeKey, JSON.stringify(form.custom)]);

  const onSubmit = async () => {
    if (!token) return alert('Bạn chưa đăng nhập.');
    setLoading(true);
    try {
      const normalizedCustom = { ...form.custom };
      let derivedStart = undefined;
      let derivedEnd = undefined;

      if (isSingleDay && startDateKey && endDateKey) {
          normalizedCustom[endDateKey] = normalizedCustom[startDateKey];
      }

      if (form.typeKey === 'meeting_room_booking') {
          const { bookingDate, fromTime, toTime } = normalizedCustom;
          if (bookingDate && fromTime && toTime) {
              derivedStart = new Date(`${bookingDate}T${fromTime}:00`).toISOString();
              derivedEnd = new Date(`${bookingDate}T${toTime}:00`).toISOString();
          }
      } else {
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
        description: '',
        priority: '',    
        custom: normalizedCustom,
        bookingStart: derivedStart, 
        bookingEnd: derivedEnd,
        bookingRoomKey: normalizedCustom.roomKey,
        files,
      });

      navigate('/requests/mine');
    } catch (err: any) {
      alert(err?.message || 'Không thể tạo yêu cầu. Vui lòng thử lại.');
      setLoading(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100 bg-light">
      
      {/* CONTROL PANEL */}
      <div className="o_control_panel bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center sticky-top shadow-sm" style={{zIndex: 100, height: 60}}>
        <div className="d-flex align-items-center gap-3">
            <button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(-1)}>
                <i className="bi bi-arrow-left"></i> Hủy
            </button>
            <div className="vr"></div>
            <nav aria-label="breadcrumb">
                <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item text-muted">Yêu cầu</li>
                    <li className="breadcrumb-item active fw-bold text-primary">Tạo mới</li>
                </ol>
            </nav>
        </div>
        <div>
            <button className="btn btn-primary px-4 fw-500 shadow-sm" onClick={onSubmit} disabled={loading || !token}>
                {loading ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-cloud-upload me-2"></i>}
                Gửi yêu cầu
            </button>
        </div>
      </div>

      {/* MAIN WORKSPACE */}
      <div className="flex-grow-1 overflow-y-auto p-4 d-flex justify-content-center">
         <div className="container-fluid" style={{maxWidth: 1200}}>
            <div className="row g-4">
                
                {/* LEFT: FORM SHEET */}
                <div className={aiSuggestions.length > 0 ? "col-lg-8" : "col-lg-8 mx-auto"}>
                    <div className="card border shadow-sm rounded-1">
                        <div className="card-body p-4 p-md-5">
                            
                            <div className="row mb-4 pb-3 border-bottom">
                                <div className="col-md-6">
                                    <label className="text-muted small text-uppercase fw-bold mb-1">Phòng ban / Danh mục</label>
                                    <div className="btn-group w-100">
                                        <button 
                                            className={`btn btn-sm ${form.category === 'HR' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setForm(o => ({...o, category: 'HR', typeKey: '', custom: {}}))}
                                        >
                                            <i className="bi bi-people-fill me-2"></i> Nhân sự (HR)
                                        </button>
                                        <button 
                                            className={`btn btn-sm ${form.category === 'IT' ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            onClick={() => setForm(o => ({...o, category: 'IT', typeKey: '', custom: {}}))}
                                        >
                                            <i className="bi bi-pc-display me-2"></i> IT Support
                                        </button>
                                    </div>
                                </div>
                                <div className="col-md-6 mt-3 mt-md-0">
                                    <label className="text-muted small text-uppercase fw-bold mb-1">Loại yêu cầu</label>
                                    <select
                                        className="form-select"
                                        value={form.typeKey}
                                        onChange={(e) => {
                                            const tk = e.target.value;
                                            const found = catalog.find((c) => c.typeKey === tk);
                                            setForm(o => ({ ...o, typeKey: tk, title: found?.title ?? '', custom: {} }));
                                            setRemoteOptions({});
                                            setIsSingleDay(false);
                                        }}
                                    >
                                        <option value="">-- Chọn loại yêu cầu --</option>
                                        {catalog.map((c) => (
                                            <option key={c.typeKey} value={c.typeKey}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {current ? (
                                <div className="animate__animated animate__fadeIn">
                                    <div className="mb-4">
                                        <label className="form-label h5 text-primary">Tiêu đề yêu cầu</label>
                                        <input
                                            className="form-control form-control-lg bg-light"
                                            required
                                            value={form.title}
                                            onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
                                            placeholder={`Ví dụ: ${current.title}...`}
                                        />
                                        <div className="form-text">Tiêu đề ngắn gọn giúp chúng tôi hỗ trợ nhanh hơn.</div>
                                    </div>

                                    {/* [CẬP NHẬT UI] Checkbox Single Day đẹp hơn, không bị lệch */}
                                    {endDateKey && (
                                        <div className="mb-4 p-3 bg-light rounded border border-start-0 border-end-0 border-top-0 border-bottom-0 border-3 border-primary-subtle">
                                            <div className="form-check form-switch d-flex align-items-center ps-0">
                                                <input 
                                                    className="form-check-input ms-0 me-3"
                                                    type="checkbox" 
                                                    role="switch"
                                                    id="singleDayCheck"
                                                    checked={isSingleDay}
                                                    onChange={e => setIsSingleDay(e.target.checked)}
                                                    style={{width: '2.5em', height: '1.25em', cursor: 'pointer'}}
                                                />
                                                <label className="form-check-label user-select-none" htmlFor="singleDayCheck" style={{cursor: 'pointer'}}>
                                                    <span className="fw-bold text-dark">Chỉ nghỉ 1 ngày</span>
                                                    <div className="text-muted small">Tự động sao chép Ngày bắt đầu sang Ngày kết thúc</div>
                                                </label>
                                            </div>
                                        </div>
                                    )}

                                    <div className="p-3 bg-light rounded border mb-4">
                                        <RequestDynamicFields
                                            fields={visibleFields}
                                            value={form.custom}
                                            onChange={(custom) => setForm((old) => ({ ...old, custom }))}
                                            disabled={loading}
                                            dynamicOptions={remoteOptions}
                                            loadingRemote={loadingRemote}
                                        />
                                    </div>

                                    <div>
                                        <label className="form-label fw-bold small text-uppercase text-muted">
                                            <i className="bi bi-paperclip me-1"></i> Tệp đính kèm
                                        </label>
                                        <input ref={fileInputRef} type="file" multiple className="form-control" />
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <i className="bi bi-arrow-up-circle fs-1 d-block mb-3"></i>
                                    Vui lòng chọn <strong>Loại yêu cầu</strong> ở trên để tiếp tục.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: AI */}
                {aiSuggestions.length > 0 && (
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm bg-info-subtle sticky-top" style={{top: 80}}>
                            <div className="card-header bg-transparent border-0 pt-3 pb-0">
                                <h6 className="fw-bold text-info-emphasis">
                                    <i className="bi bi-robot me-2"></i> Gợi ý thông minh
                                </h6>
                            </div>
                            <div className="card-body">
                                <p className="small text-muted mb-3">
                                    Có thể bạn đang gặp vấn đề này? Thử các giải pháp sau trước khi gửi yêu cầu:
                                </p>
                                <div className="list-group list-group-flush rounded bg-white">
                                    {aiSuggestions.map((s) => (
                                        <div key={s.id} className="list-group-item p-3">
                                            <div className="d-flex w-100 justify-content-between">
                                                <h6 className="mb-1 text-dark fw-bold">{s.title}</h6>
                                                <small className="text-success fw-bold">{(s.score * 100).toFixed(0)}% Match</small>
                                            </div>
                                            <p className="mb-1 small text-secondary">{s.suggestion}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
         </div>
      </div>
    </div>
  );
}