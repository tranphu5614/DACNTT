import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import type { 
  CatalogField, 
  StaticSelectField, 
  StaticSelectOption, 
  BaseInputField 
} from '../api/catalog'; 

type SelectOptions = StaticSelectOption[];

type Props = {
  fields: CatalogField[]; 
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  disabled?: boolean;
  errors?: Record<string, string | undefined>;
  dynamicOptions?: Record<string, SelectOptions>;
  loadingRemote?: Record<string, boolean>;
};

function isBaseInputField(field: CatalogField): field is BaseInputField {
    return field.type !== 'select' && field.type !== 'room_selector';
}

export default function RequestDynamicFields({ 
  fields, 
  value, 
  onChange, 
  disabled, 
  errors, 
  dynamicOptions = {}, 
  loadingRemote = {},
}: Props) {
  const { user } = useAuth();
  const [requestDays, setRequestDays] = useState(0);

  const calculateWorkingDays = (start: Date, end: Date) => {
    let count = 0;
    let cur = new Date(start);
    cur.setHours(0,0,0,0);
    const last = new Date(end);
    last.setHours(0,0,0,0);

    while (cur <= last) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) {
            count++;
        }
        cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  useEffect(() => {
      if (value.fromDate && value.toDate) {
          const start = new Date(value.fromDate);
          const end = new Date(value.toDate);
          
          if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
             if (start > end) {
                 setRequestDays(0);
             } else {
                 const days = calculateWorkingDays(start, end);
                 setRequestDays(days);
             }
          }
      } else {
          setRequestDays(0);
      }
  }, [value.fromDate, value.toDate]);

  function setVal(key: string, v: any) {
    const field = fields.find(f => f.key === key);
    if (field?.type === 'number' && v === '') {
        onChange({ ...value, [key]: undefined });
    } else {
        onChange({ ...value, [key]: v });
    }
  }

  const toDateValue = (v: any, type: string): string => {
    if (!v) return '';
    try {
        const date = new Date(v);
        if (isNaN(date.getTime())) return v;
        if (type === 'date') return date.toISOString().split('T')[0];
        if (type === 'datetime') return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    } catch {
        return String(v);
    }
    return String(v);
  }

  // [MỚI] Hàm format hiển thị dd/mm/yyyy cho CSS trick
  const formatDisplayDate = (val: any) => {
      if (!val) return '';
      const date = new Date(val);
      if (isNaN(date.getTime())) return '';
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
  }

  return (
    <>
      {fields.map((f) => {
        const err = errors?.[f.key];
        const common = { id: `field_${f.key}`, name: f.key, disabled, required: f.required };

        // --- RENDER ROOM SELECTOR ---
        if (f.type === 'room_selector') {
            const options: SelectOptions = dynamicOptions[f.key] || [];
            const isLoading = !!loadingRemote[f.key];
            const currentVal = value?.[f.key];

            return (
                <div className="mb-4" key={f.key}>
                    <label className="form-label d-block fw-bold mb-3">
                        {f.label} {f.required && <span className="text-danger">*</span>}
                    </label>
                    
                    {isLoading && (
                      <div className="d-flex align-items-center gap-2 text-secondary mb-2">
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        <small>Đang tìm phòng trống...</small>
                      </div>
                    )}
                    
                    {!isLoading && options.length === 0 && (
                        <div className="alert alert-light border text-center text-muted py-3 small">
                           🗓️ Vui lòng chọn <b>Ngày</b> và <b>Giờ</b> để xem danh sách phòng.
                        </div>
                    )}

                    <div className="room-grid">
                        {options.map((o) => {
                            const isSelected = currentVal === o.value;
                            const isBusy = !!o.isBusy;
                            
                            const isLarge = o.label.toLowerCase().includes('lớn') || o.value.includes('LARGE');
                            const capacity = isLarge ? '20 người' : '8 người';
                            const facilities = isLarge ? 'Máy chiếu, TV, Bảng, Loa' : 'TV, Bảng trắng';

                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    disabled={isBusy || disabled}
                                    onClick={() => setVal(f.key, o.value)}
                                    className={`room-card ${isSelected ? 'selected' : ''} ${isBusy ? 'busy' : ''}`}
                                >
                                    <div className="d-flex align-items-start">
                                        <div className="room-icon me-3 mt-1">
                                            {isLarge ? '🏢' : '🚪'}
                                        </div>
                                        <div className="text-start flex-grow-1">
                                            <div className="room-name mb-1">{o.label}</div>
                                            <div className="text-muted small mb-1" style={{fontSize: '0.8rem'}}>
                                                👥 Sức chứa: <b>{capacity}</b>
                                            </div>
                                            <div className="text-muted small" style={{fontSize: '0.75rem'}}>
                                                🛠 {facilities}
                                            </div>
                                            {!isBusy && (
                                                <div className="room-status-available mt-2">
                                                   <small>● Sẵn sàng</small>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {isBusy && (
                                      <div className="room-busy-overlay">
                                        <span>ĐÃ ĐẶT</span>
                                      </div>
                                    )}
                                    
                                    {isSelected && <div className="room-check-mark">✓</div>}
                                </button>
                            );
                        })}
                    </div>
                    {err && <div className="text-danger small mt-2">⚠️ {err}</div>}
                </div>
            );
        }

        // --- XỬ LÝ ĐẶC BIỆT CHO TRƯỜNG "leaveType" ---
        if (f.key === 'leaveType' && f.type === 'select') {
            const remainingDays = (user as any)?.paidLeaveDaysLeft ?? 0;
            const notEnoughDays = requestDays > remainingDays;
            
            const isDynamic = 'optionsUrlTemplate' in f;
            const options: SelectOptions = isDynamic 
              ? dynamicOptions[f.key] || [] 
              : (f as StaticSelectField).options;

            return (
                <div className="mb-3" key={f.key}>
                    <label className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                    
                    <div className="alert alert-info py-2 small">
                        Ngày phép có lương còn lại: <strong>{remainingDays}</strong> ngày.<br/>
                        Bạn đang chọn nghỉ: <strong>{requestDays}</strong> ngày làm việc (đã trừ T7/CN).
                    </div>

                    <select
                        {...common}
                        className={`form-select ${err ? 'is-invalid' : ''}`}
                        value={value?.[f.key] ?? ''}
                        onChange={(e) => setVal(f.key, e.target.value)}
                    >
                        <option value="">-- Chọn loại nghỉ --</option>
                        {options.map((o) => {
                            const isPaidOption = o.value === 'PAID'; 
                            const isDisabled = isPaidOption && notEnoughDays;
                            
                            return (
                                <option key={o.value} value={o.value} disabled={isDisabled}>
                                    {o.label} {isDisabled ? '(Không đủ ngày phép)' : ''}
                                </option>
                            );
                        })}
                    </select>
                    {err && <div className="invalid-feedback">{err}</div>}
                </div>
            );
        }

        if (f.type === 'select') {
          // ... (giữ nguyên logic select thường)
          const isDynamic = 'optionsUrlTemplate' in f; 
          const options: SelectOptions = isDynamic 
              ? dynamicOptions[f.key] || [] 
              : (f as StaticSelectField).options; 
          const isLoading = isDynamic && !!loadingRemote[f.key];

          return (
            <div className="mb-3" key={f.key}>
              <label htmlFor={common.id} className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
              <select
                {...common}
                className={`form-select ${err ? 'is-invalid' : ''}`}
                value={value?.[f.key] ?? ''}
                onChange={(e) => setVal(f.key, e.target.value)}
                disabled={disabled || (isDynamic && (isLoading || options.length === 0))}
              >
                <option value="">{isDynamic ? (isLoading ? 'Loading...' : '-- Select --') : '-- Select --'}</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {isDynamic && !isLoading && options.length === 0 && <div className="form-text text-danger">No matching options found.</div>}
              {err && <div className="invalid-feedback">{err}</div>}
            </div>
          );
        }
        
        // --- RENDER INPUTS (CÓ SỬA ĐỔI CHO DATE) ---
        if (isBaseInputField(f)) {
            const commonProps = {
                required: !!f.required,
                value: (f.type === 'date' || f.type === 'datetime') ? toDateValue(value?.[f.key], f.type) : (value?.[f.key] ?? ''), 
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVal(f.key, e.target.value),
            };

            // [MỚI] Thêm class và attribute data-date để CSS xử lý
            const customDateClass = f.type === 'date' ? 'custom-date-input' : '';
            const dataDateAttr = f.type === 'date' ? { 'data-date': formatDisplayDate(value?.[f.key]) } : {};

            return (
                <div className="mb-3" key={f.key}>
                    <label htmlFor={common.id} className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                    {f.type === 'time' && <input type="time" className={`form-control ${err ? 'is-invalid' : ''}`} {...common} {...commonProps} />}
                    {f.type === 'datetime' && <input type="datetime-local" className={`form-control ${err ? 'is-invalid' : ''}`} {...common} {...commonProps} />}
                    
                    {/* [SỬA] Input Date với class đặc biệt */}
                    {f.type === 'date' && (
                        <input 
                            type="date" 
                            className={`form-control ${customDateClass} ${err ? 'is-invalid' : ''}`} 
                            {...common} 
                            {...commonProps} 
                            {...dataDateAttr}
                        />
                    )}
                    
                    {f.type === 'number' && <input type="number" className={`form-control ${err ? 'is-invalid' : ''}`} {...common} {...commonProps} />}
                    {f.type === 'text' && <input type="text" className={`form-control ${err ? 'is-invalid' : ''}`} {...common} {...commonProps} />}
                    {f.type === 'textarea' && <textarea rows={4} className={`form-control ${err ? 'is-invalid' : ''}`} {...common} {...commonProps} value={value?.[f.key] ?? ''} />}
                    {err && <div className="invalid-feedback">{err}</div>}
                </div>
            );
        }

        return null;
      })}
    </>
  );
}