// Mặc định: bạn có thể chỉnh/sửa/đổi tên typeKey, fields tuỳ ý
export type CatalogField =
  | { key: string; label: string; type: 'text' | 'textarea' | 'date' | 'number'; required?: boolean }
  | { key: string; label: string; type: 'select'; required?: boolean; options: { value: string; label: string }[] };

export type CatalogItem = {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  fields: CatalogField[];
};

export const DEFAULT_CATALOG: CatalogItem[] = [
  {
    category: 'HR',
    typeKey: 'leave_request',
    title: 'Xin nghỉ phép',
    fields: [
      { key: 'from', label: 'Từ ngày', type: 'date', required: true },
      { key: 'to', label: 'Đến ngày', type: 'date', required: true },
      { key: 'reason', label: 'Lý do', type: 'textarea' },
    ],
  },
  {
    category: 'HR',
    typeKey: 'wfh_request',
    title: 'Đăng ký WFH',
    fields: [
      { key: 'date', label: 'Ngày làm việc', type: 'date', required: true },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
    ],
  },
  {
    category: 'IT',
    typeKey: 'it_support',
    title: 'Hỗ trợ IT',
    fields: [
      {
        key: 'device',
        label: 'Thiết bị',
        type: 'select',
        options: [
          { value: 'laptop', label: 'Laptop' },
          { value: 'desktop', label: 'Máy bàn' },
          { value: 'monitor', label: 'Màn hình' },
          { value: 'peripheral', label: 'Thiết bị ngoại vi' },
        ],
        required: true,
      },
      { key: 'problem', label: 'Vấn đề', type: 'textarea', required: true },
    ],
  },
  {
    category: 'IT',
    typeKey: 'software_access',
    title: 'Cấp quyền phần mềm',
    fields: [
      { key: 'software', label: 'Tên phần mềm', type: 'text', required: true },
      { key: 'justification', label: 'Lý do', type: 'textarea' },
    ],
  },
];
