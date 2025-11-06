// backend/src/requests/rooms.constants.ts
export type RoomSize = 'SMALL' | 'LARGE';

export interface Room {
  key: string;   // mã lưu trong ticket
  name: string;  // tên hiển thị
  size: RoomSize;
}

// 5 phòng: 3 nhỏ, 2 lớn
export const ROOMS: Room[] = [
  { key: 'S1', name: 'Phòng Nhỏ 1', size: 'SMALL' },
  { key: 'S2', name: 'Phòng Nhỏ 2', size: 'SMALL' },
  { key: 'S3', name: 'Phòng Nhỏ 3', size: 'SMALL' },
  { key: 'L1', name: 'Phòng Lớn 1', size: 'LARGE' },
  { key: 'L2', name: 'Phòng Lớn 2', size: 'LARGE' },
];
