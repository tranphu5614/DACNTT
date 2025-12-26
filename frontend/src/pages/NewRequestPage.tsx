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
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#f9f9f9', fontSize: '0.92rem' }}> {/* [STYLE] Giảm font size toàn trang */}
      
      {/* MAIN WORKSPACE - Full Width, Compact Spacing */}
      <div className="flex-grow-1 overflow-y-auto p-3"> {/* [STYLE] Giảm padding container chính */}
         
         <div className="container-fluid p-0">
            
            <div className="row g-3"> {/* [STYLE] Giảm khoảng cách Grid */}
                
                {/* LEFT: FORM SHEET */}
                <div className={aiSuggestions.length > 0 ? "col-lg-9" : "col-12"}>
                    <div className="card border shadow-sm rounded-2 overflow-hidden h-100">
                        
                        {/* 1. INTERNAL HEADER - Compact */}
                        <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-light">
                            <nav aria-label="breadcrumb">
                                <ol className="breadcrumb mb-0 small">
                                    <li className="breadcrumb-item text-muted">Yêu cầu</li>
                                    <li className="breadcrumb-item active fw-bold" style={{ color: '#008784' }}>Tạo mới</li>
                                </ol>
                            </nav>
                            <button className="btn btn-sm btn-white border text-muted d-flex align-items-center gap-1 shadow-sm" onClick={() => navigate(-1)} style={{fontSize: '0.8rem'}}>
                                <i className="bi bi-x-lg"></i> Hủy
                            </button>
                        </div>

                        <div className="card-body p-3 p-md-4"> {/* [STYLE] Giảm padding Card Body */}
                            
                            {/* 2. Chọn Phòng ban & Loại (Compact Row) */}
                            <div className="row g-3 mb-3 pb-3 border-bottom">
                                <div className="col-md-4 col-xl-3">
                                    <label className="text-muted small fw-bold mb-1" style={{fontSize: '0.75rem'}}>PHÒNG BAN</label>
                                    <div className="btn-group w-100" role="group">
                                        <input 
                                            type="radio" className="btn-check" name="btnCategory" id="btnHr" autoComplete="off" 
                                            checked={form.category === 'HR'} onChange={() => setForm(o => ({...o, category: 'HR', typeKey: '', custom: {}}))}
                                        />
                                        <label className={`btn btn-sm ${form.category === 'HR' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="btnHr"> {/* btn-sm */}
                                            <i className="bi bi-people-fill me-1"></i> HR
                                        </label>

                                        <input 
                                            type="radio" className="btn-check" name="btnCategory" id="btnIt" autoComplete="off"
                                            checked={form.category === 'IT'} onChange={() => setForm(o => ({...o, category: 'IT', typeKey: '', custom: {}}))}
                                        />
                                        <label className={`btn btn-sm ${form.category === 'IT' ? 'btn-primary' : 'btn-outline-secondary'}`} htmlFor="btnIt"> {/* btn-sm */}
                                            <i className="bi bi-pc-display me-1"></i> IT
                                        </label>
                                    </div>
                                </div>
                                <div className="col-md-8 col-xl-9">
                                    <label className="text-muted small fw-bold mb-1" style={{fontSize: '0.75rem'}}>LOẠI YÊU CẦU</label>
                                    <select
                                        className="form-select form-select-sm bg-light" // form-select-sm
                                        value={form.typeKey}
                                        onChange={(e) => {
                                            const tk = e.target.value;
                                            const found = catalog.find((c) => c.typeKey === tk);
                                            setForm(o => ({ ...o, typeKey: tk, title: found?.title ?? '', custom: {} }));
                                            setRemoteOptions({});
                                            setIsSingleDay(false);
                                        }}
                                        style={{height: '31px'}}
                                    >
                                        <option value="">-- Chọn danh mục --</option>
                                        {catalog.map((c) => (
                                            <option key={c.typeKey} value={c.typeKey}>{c.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* 3. Form Nhập Liệu */}
                            {current ? (
                                <div className="animate__animated animate__fadeIn">
                                    
                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-secondary">Tiêu đề yêu cầu <span className="text-danger">*</span></label>
                                        <input
                                            className="form-control bg-white border-secondary-subtle fw-semibold" // Bỏ form-control-lg
                                            required
                                            value={form.title}
                                            onChange={(e) => setForm((old) => ({ ...old, title: e.target.value }))}
                                            placeholder={`Ví dụ: ${current.title}...`}
                                            style={{fontSize: '0.95rem'}}
                                        />
                                    </div>

                                    {/* Dynamic Fields Container - Compact */}
                                    <div className="p-3 bg-light rounded-2 border mb-3">
                                        {endDateKey && (
                                            <div className="form-check form-switch mb-3 pb-2 border-bottom border-white">
                                                <input 
                                                    className="form-check-input" type="checkbox" role="switch" id="singleDayCheck"
                                                    checked={isSingleDay}
                                                    onChange={e => setIsSingleDay(e.target.checked)}
                                                    style={{cursor: 'pointer', transform: 'scale(0.8)'}} // Thu nhỏ switch
                                                />
                                                <label className="form-check-label fw-bold small" htmlFor="singleDayCheck" style={{marginTop: '2px'}}>
                                                    Chỉ trong 1 ngày
                                                </label>
                                            </div>
                                        )}

                                        {/* Lưu ý: Để RequestDynamicFields nhỏ lại, bạn cần đảm bảo component đó dùng class form-control-sm hoặc kế thừa style */}
                                        <div className="small-form-group">
                                            <RequestDynamicFields
                                                fields={visibleFields}
                                                value={form.custom}
                                                onChange={(custom) => setForm((old) => ({ ...old, custom }))}
                                                disabled={loading}
                                                dynamicOptions={remoteOptions}
                                                loadingRemote={loadingRemote}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-bold small text-uppercase text-muted mb-1" style={{fontSize: '0.75rem'}}>
                                            <i className="bi bi-paperclip me-1"></i> Đính kèm
                                        </label>
                                        <input ref={fileInputRef} type="file" multiple className="form-control form-control-sm" /> {/* form-control-sm */}
                                    </div>

                                    <div className="mt-4 pt-3 border-top d-flex justify-content-end gap-2">
                                        <button 
                                            className="btn btn-sm btn-light px-3"  // btn-sm
                                            onClick={() => navigate(-1)}
                                            disabled={loading}
                                        >
                                            Quay lại
                                        </button>
                                        <button 
                                            className="btn btn-sm btn-primary px-4 fw-bold shadow-sm" // btn-sm
                                            onClick={onSubmit} 
                                            disabled={loading || !token}
                                            style={{ backgroundColor: '#008784', borderColor: '#008784' }}
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                                    Đang gửi...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send-fill me-2"></i> Gửi Yêu Cầu
                                                </>
                                            )}
                                        </button>
                                    </div>

                                </div>
                            ) : (
                                <div className="text-center py-5">
                                    <div className="mb-2 text-muted opacity-25">
                                        <i className="bi bi-inbox fs-2"></i>
                                    </div>
                                    <small className="text-muted">Chọn loại yêu cầu ở trên</small>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: AI Suggestions - Compact */}
                {aiSuggestions.length > 0 && (
                    <div className="col-lg-3">
                        <div className="card border-0 shadow-sm bg-primary-subtle sticky-top" style={{top: 10}}>
                            <div className="card-header bg-transparent border-0 pt-2 pb-0">
                                <h6 className="fw-bold text-primary-emphasis d-flex align-items-center small mb-1">
                                    <i className="bi bi-stars me-2"></i> Gợi ý AI
                                </h6>
                            </div>
                            <div className="card-body p-2">
                                <div className="list-group list-group-flush rounded shadow-sm overflow-hidden">
                                    {aiSuggestions.map((s) => (
                                        <div key={s.id} className="list-group-item list-group-item-action p-2 border-start border-3 border-primary">
                                            <div className="d-flex w-100 justify-content-between align-items-center mb-1">
                                                <h6 className="mb-0 fw-bold text-dark text-truncate small" style={{maxWidth: '120px'}} title={s.title}>{s.title}</h6>
                                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill" style={{fontSize: '0.6rem'}}>
                                                    {(s.score * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                            <p className="mb-0 small text-secondary lh-1" style={{fontSize: '0.75rem'}}>{s.suggestion}</p>
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