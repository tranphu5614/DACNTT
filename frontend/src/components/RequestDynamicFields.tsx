import React from 'react';
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

  return (
    <>
      {fields.map((f) => {
        const err = errors?.[f.key];
        const common = { id: `field_${f.key}`, name: f.key, disabled, required: f.required };

        // --- [UI NEW] RENDER ROOM SELECTOR (GRID UI) ---
        if (f.type === 'room_selector') {
            const options: SelectOptions = dynamicOptions[f.key] || [];
            const isLoading = !!loadingRemote[f.key];
            const currentVal = value?.[f.key];

            return (
                <div className="mb-4" key={f.key}>
                    <label className="form-label d-block">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                    
                    {isLoading && (
                      <div className="d-flex align-items-center gap-2 text-secondary mb-2">
                        <div className="spinner-border spinner-border-sm" role="status"></div>
                        <small>Searching for rooms...</small>
                      </div>
                    )}
                    
                    {!isLoading && options.length === 0 && (
                        <div className="alert alert-light border text-center text-muted py-3 small">
                           🗓️ Please select <b>Date</b> and <b>Time</b> to see available rooms.
                        </div>
                    )}

                    <div className="room-grid">
                        {options.map((o) => {
                            const isSelected = currentVal === o.value;
                            const isBusy = !!o.isBusy;
                            
                            return (
                                <button
                                    key={o.value}
                                    type="button"
                                    disabled={isBusy || disabled}
                                    onClick={() => setVal(f.key, o.value)}
                                    className={`room-card-btn ${isSelected ? 'selected' : ''}`}
                                >
                                    <div className="fw-bold">{o.label}</div>
                                    {isBusy ? (
                                      <div className="room-busy-badge">Booked</div>
                                    ) : (
                                      <div className="small text-success mt-1" style={{fontSize: '0.75rem'}}>Available</div>
                                    )}
                                    {isSelected && <div className="room-check-icon">✓</div>}
                                </button>
                            );
                        })}
                    </div>
                    {err && <div className="text-danger small mt-1">{err}</div>}
                </div>
            );
        }

        // --- RENDER SELECT ---
        if (f.type === 'select') {
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
        
        // --- RENDER INPUTS ---
        if (isBaseInputField(f)) {
            const commonProps = {
                className: `form-control ${err ? 'is-invalid' : ''}`,
                required: !!f.required,
                value: (f.type === 'date' || f.type === 'datetime') ? toDateValue(value?.[f.key], f.type) : (value?.[f.key] ?? ''), 
                onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setVal(f.key, e.target.value),
            };

            return (
                <div className="mb-3" key={f.key}>
                    <label htmlFor={common.id} className="form-label">{f.label} {f.required && <span className="text-danger">*</span>}</label>
                    {f.type === 'time' && <input type="time" {...common} {...commonProps} />}
                    {f.type === 'datetime' && <input type="datetime-local" {...common} {...commonProps} />}
                    {f.type === 'date' && <input type="date" {...common} {...commonProps} />}
                    {f.type === 'number' && <input type="number" {...common} {...commonProps} />}
                    {f.type === 'text' && <input type="text" {...common} {...commonProps} />}
                    {f.type === 'textarea' && <textarea rows={4} {...common} {...commonProps} value={value?.[f.key] ?? ''} />}
                    {err && <div className="invalid-feedback">{err}</div>}
                </div>
            );
        }

        return null;
      })}
    </>
  );
}