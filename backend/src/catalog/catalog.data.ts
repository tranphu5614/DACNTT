// backend/src/catalog/catalog.data.ts

// ---- Types ----
export type StaticSelectOption = { value: string; label: string };

export type StaticSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  options: StaticSelectOption[]; // static options
};

export type DynamicSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  // FE sẽ thay {custom.xxx} hoặc {title}... vào template rồi gọi để lấy options
  optionsUrlTemplate: string;
};

export type CatalogField =
  | {
      key: string;
      label: string;
      type: 'text' | 'textarea' | 'date' | 'number' | 'datetime';
      required?: boolean;
    }
  | StaticSelectField
  | DynamicSelectField;

// thêm kiểu cho bước duyệt
export type ApprovalStep = {
  level: number;
  role: string; // ví dụ: 'HR_MANAGER' | 'IT_MANAGER' | 'ADMIN'
};

export type CatalogItem = {
  category: 'HR' | 'IT';
  typeKey: string;
  title: string;
  fields: CatalogField[];
  // nếu không khai thì hiểu là auto-approve
  approvalFlow?: ApprovalStep[];
};

// ---- Default catalog ----
export const DEFAULT_CATALOG: CatalogItem[] = [
  // HR: Nghỉ phép
  {
    category: 'HR',
    typeKey: 'leave_request',
    title: 'Xin nghỉ phép',
    fields: [
      { key: 'from', label: 'Từ ngày', type: 'date', required: true },
      { key: 'to', label: 'Đến ngày', type: 'date', required: true },
      { key: 'reason', label: 'Lý do', type: 'textarea' },
    ],
    // ví dụ: nghỉ phép phải qua HR
    approvalFlow: [{ level: 1, role: 'HR_MANAGER' }],
  },

  // HR: Đăng ký WFH
  {
    category: 'HR',
    typeKey: 'wfh_request',
    title: 'Đăng ký WFH',
    fields: [
      { key: 'date', label: 'Ngày làm việc', type: 'date', required: true },
      { key: 'note', label: 'Ghi chú', type: 'textarea' },
    ],
    // WFH: trưởng bộ phận duyệt trước, rồi HR
    approvalFlow: [
      { level: 1, role: 'ADMIN' }, // hoặc 'LINE_MANAGER' nếu bạn có role này
      { level: 2, role: 'HR_MANAGER' },
    ],
  },

  // === HR: Đăng ký phòng họp (MỚI) ===
  {
    category: 'HR',
    typeKey: 'meeting_room_booking',
    title: 'Đăng ký phòng họp',
    fields: [
      // Chọn loại phòng
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
      // Khung thời gian
      { key: 'start', label: 'Thời gian bắt đầu', type: 'datetime', required: true },
      { key: 'end', label: 'Thời gian kết thúc', type: 'datetime', required: true },
      // Danh sách phòng trống theo size + thời gian (fetch động)
      {
        key: 'roomKey',
        label: 'Phòng họp',
        type: 'select',
        required: true,
        optionsUrlTemplate:
          '/requests/available-rooms?start={custom.start}&end={custom.end}&size={custom.size}',
      },
    ],
    // đặt phòng: để ADMIN/RECEPTION duyệt
    approvalFlow: [{ level: 1, role: 'ADMIN' }],
  },

  // IT: Hỗ trợ IT
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
    // IT tự xử → auto-approve
    approvalFlow: [],
  },

  // IT: Cấp quyền phần mềm
  {
    category: 'IT',
    typeKey: 'software_access',
    title: 'Cấp quyền phần mềm',
    fields: [
      { key: 'software', label: 'Tên phần mềm', type: 'text', required: true },
      { key: 'justification', label: 'Lý do', type: 'textarea' },
    ],
    // ví dụ: IT duyệt trước, ADMIN duyệt sau
    approvalFlow: [
      { level: 1, role: 'IT_MANAGER' },
      { level: 2, role: 'ADMIN' },
    ],
  },
];
