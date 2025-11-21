export type StaticSelectOption = { value: string; label: string };

export type StaticSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  options: StaticSelectOption[];
};

export type DynamicSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  optionsUrlTemplate: string;
};

// Định nghĩa thêm loại field mới cho Catalog Backend
export type CatalogField =
  | {
      key: string;
      label: string;
      type: 'text' | 'textarea' | 'date' | 'number' | 'datetime' | 'time' | 'room_selector'; // [UPDATED] Thêm room_selector
      required?: boolean;
      optionsUrlTemplate?: string; // Cho room_selector
    }
  | StaticSelectField
  | DynamicSelectField;

export type ApprovalStep = {
  level: number;
  role: string;
};

export type CatalogItem = {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  fields: CatalogField[];
  approvalFlow?: ApprovalStep[];
};

export const DEFAULT_CATALOG: CatalogItem[] = [
  // ... (Giữ nguyên Leave Request, WFH)
  {
    category: 'HR',
    typeKey: 'leave_request',
    title: 'Xin nghỉ phép',
    fields: [
      { key: 'from', label: 'Từ ngày', type: 'date', required: true },
      { key: 'to', label: 'Đến ngày', type: 'date', required: true },
      { key: 'reason', label: 'Lý do', type: 'textarea' },
    ],
    approvalFlow: [{ level: 1, role: 'HR_MANAGER' }],
  },
  {
    category: 'HR',
    typeKey: 'wfh_request',
    title: 'Đăng ký WFH',
    fields: [
      { key: 'date', label: 'Ngày làm việc', type: 'date', required: true },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
    ],
    approvalFlow: [
      { level: 1, role: 'ADMIN' },
      { level: 2, role: 'HR_MANAGER' },
    ],
  },

  // === HR: Đăng ký phòng họp ===
  {
    category: 'HR',
    typeKey: 'meeting_room_booking',
    title: 'Đăng ký phòng họp',
    fields: [
      {
        key: 'size',
        label: 'Loại phòng',
        type: 'select',
        required: true,
        options: [
          { value: 'SMALL', label: 'Phòng nhỏ (≤8 người)' },
          { value: 'LARGE', label: 'Phòng lớn (>8 người)' },
        ],
      },
      { key: 'bookingDate', label: 'Ngày đặt', type: 'date', required: true },
      { key: 'fromTime', label: 'Giờ bắt đầu', type: 'time', required: true },
      { key: 'toTime', label: 'Giờ kết thúc', type: 'time', required: true },
      
      // [UPDATED] Đổi type sang 'room_selector'
      {
        key: 'roomKey',
        label: 'Phòng họp',
        type: 'room_selector', // [NEW]
        required: true,
        optionsUrlTemplate:
          '/requests/available-rooms?date={custom.bookingDate}&from={custom.fromTime}&to={custom.toTime}&size={custom.size}',
      },
    ],
    approvalFlow: [{ level: 1, role: 'ADMIN' }],
  },

  // ... (Giữ nguyên IT Support, Software Access)
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
    approvalFlow: [],
  },
  {
    category: 'IT',
    typeKey: 'software_access',
    title: 'Cấp quyền phần mềm',
    fields: [
      { key: 'software', label: 'Tên phần mềm', type: 'text', required: true },
      { key: 'justification', label: 'Lý do', type: 'textarea' },
    ],
    approvalFlow: [
      { level: 1, role: 'IT_MANAGER' },
      { level: 2, role: 'ADMIN' },
    ],
  },
];