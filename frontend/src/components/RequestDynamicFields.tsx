// frontend/src/components/RequestDynamicFields.tsx
import React from 'react';
import type { CatalogField } from '../api/catalog';

type Props = {
  fields: CatalogField[];
  value: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
  disabled?: boolean;
  errors?: Record<string, string | undefined>;
};

export default function RequestDynamicFields({ fields, value, onChange, disabled, errors }: Props) {
  function setVal(key: string, v: any) {
    onChange({ ...value, [key]: v });
  }

  return (
    <>
      {fields.map((f) => {
        const err = errors?.[f.key];
        const common = { id: `field_${f.key}`, name: f.key, disabled, required: f.required };
        return (
          <div className="mb-3" key={f.key}>
            <label htmlFor={common.id} className="form-label">
              {f.label} {f.required && <span className="text-danger">*</span>}
            </label>

            {f.type === 'text' && (
              <input
                {...common}
                className={`form-control ${err ? 'is-invalid' : ''}`}
                type="text"
                value={value?.[f.key] ?? ''}
                onChange={(e) => setVal(f.key, e.target.value)}
              />
            )}

            {f.type === 'number' && (
              <input
                {...common}
                className={`form-control ${err ? 'is-invalid' : ''}`}
                type="number"
                value={value?.[f.key] ?? ''}
                onChange={(e) => setVal(f.key, e.target.value === '' ? '' : Number(e.target.value))}
              />
            )}

            {f.type === 'date' && (
              <input
                {...common}
                className={`form-control ${err ? 'is-invalid' : ''}`}
                type="date"
                value={value?.[f.key] ?? ''}
                onChange={(e) => setVal(f.key, e.target.value)}
              />
            )}

            {f.type === 'textarea' && (
              <textarea
                {...common}
                className={`form-control ${err ? 'is-invalid' : ''}`}
                rows={4}
                value={value?.[f.key] ?? ''}
                onChange={(e) => setVal(f.key, e.target.value)}
              />
            )}

            {f.type === 'select' && 'options' in f && (
              <select
                {...common}
                className={`form-select ${err ? 'is-invalid' : ''}`}
                value={value?.[f.key] ?? ''}
                onChange={(e) => setVal(f.key, e.target.value)}
              >
                <option value="">-- chọn --</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            )}

            {err && <div className="invalid-feedback">{err}</div>}
          </div>
        );
      })}
    </>
  );
}
