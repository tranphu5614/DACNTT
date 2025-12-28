// backend/src/catalog/catalog.data.ts

export type StaticSelectOption = { value: string; label: string };

export type StaticSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  options: StaticSelectOption[];
  optionsUrlTemplate?: never; // Đảm bảo không có trường này
};

export type DynamicSelectField = {
  key: string;
  label: string;
  type: 'select';
  required?: boolean;
  optionsUrlTemplate: string;
  options?: never; // Đảm bảo không có trường này
};

// [UPDATED] Tách riêng type cho Room Selector để code rõ ràng hơn
export type RoomSelectorField = {
  key: string;
  label: string;
  type: 'room_selector';
  required?: boolean;
  optionsUrlTemplate: string; // Bắt buộc có URL để check phòng trống
};

export type BaseInputField = {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'number' | 'datetime' | 'time';
  required?: boolean;
};

// Tổng hợp các loại field
export type CatalogField = 
  | BaseInputField 
  | StaticSelectField 
  | DynamicSelectField 
  | RoomSelectorField;

export type ApprovalStep = {
  level: number;
  role: string;
};

export type CatalogItem = {
  // [UPDATED] Đổi thành string để hỗ trợ mở rộng (Sales, Admin...)
  category: string; 
  typeKey: string;
  title: string;
  fields: CatalogField[];
  approvalFlow?: ApprovalStep[];
};

export const DEFAULT_CATALOG: CatalogItem[] = [
  // 1. HR: Xin nghỉ phép
  {
    category: 'HR',
    typeKey: 'leave_request',
    title: 'Xin nghỉ phép',
    fields: [
      // [MỚI] Thêm trường chọn loại nghỉ để khớp logic trừ phép
      {
        key: 'leaveType',
        label: 'Loại nghỉ',
        type: 'select',
        required: true,
        options: [
          { value: 'PAID', label: 'Nghỉ có lương' },
          { value: 'UNPAID', label: 'Nghỉ không lương' },
        ],
      },
      // [SỬA] Đổi key 'from' -> 'fromDate' để khớp với Backend Service
      { key: 'fromDate', label: 'Từ ngày', type: 'date', required: true },
      // [SỬA] Đổi key 'to' -> 'toDate' để khớp với Backend Service
      { key: 'toDate', label: 'Đến ngày', type: 'date', required: true },
      { key: 'reason', label: 'Lý do', type: 'textarea' },
    ],
    approvalFlow: [{ level: 1, role: 'HR_MANAGER' }],
  },

  // 2. HR: Đăng ký WFH
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

  // 3. HR: Đăng ký phòng họp (Tính năng nâng cao)
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
      
      // Field đặc biệt: Chọn phòng trống
      {
        key: 'roomKey',
        label: 'Phòng họp',
        type: 'room_selector',
        required: true,
        optionsUrlTemplate:
          '/requests/available-rooms?date={custom.bookingDate}&from={custom.fromTime}&to={custom.toTime}&size={custom.size}',
      },
    ],
    // Phòng họp cần Admin duyệt (hoặc có thể để rỗng nếu muốn auto)
    approvalFlow: [{ level: 1, role: 'ADMIN' }],
  },

  // 4. IT: Hỗ trợ kỹ thuật
  {
    category: 'IT',
    typeKey: 'it_support',
    title: 'Hỗ trợ IT (Sửa chữa/Cài đặt)',
    fields: [
      {
        key: 'device',
        label: 'Thiết bị gặp lỗi',
        type: 'select',
        options: [
          { value: 'laptop', label: 'Laptop' },
          { value: 'desktop', label: 'Máy bàn' },
          { value: 'monitor', label: 'Màn hình' },
          { value: 'printer', label: 'Máy in' },
          { value: 'network', label: 'Mạng / Wifi' },
        ],
        required: true,
      },
      { key: 'problem', label: 'Mô tả vấn đề', type: 'textarea', required: true },
    ],
    approvalFlow: [], // Không cần duyệt, IT làm luôn
  },

  // 5. IT: Cấp quyền phần mềm
  {
    category: 'IT',
    typeKey: 'software_access',
    title: 'Cấp quyền truy cập hệ thống',
    fields: [
      { key: 'software', label: 'Tên phần mềm / Hệ thống', type: 'text', required: true },
      { key: 'justification', label: 'Lý do nghiệp vụ', type: 'textarea', required: true },
    ],
    approvalFlow: [
      { level: 1, role: 'IT_MANAGER' }, // Manager IT duyệt kỹ thuật
      { level: 2, role: 'ADMIN' },      // Admin duyệt bảo mật
    ],
  },
];