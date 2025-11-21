// backend/src/requests/dto/create-request.dto.ts
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';
import { Transform } from 'class-transformer'; // [UPDATED] Import Transform

const CATEGORY_VALUES = ['HR', 'IT'] as const;
const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateRequestDto {
  @IsEnum(CATEGORY_VALUES)
  category!: (typeof CATEGORY_VALUES)[number];

  @IsString()
  typeKey!: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PRIORITY_VALUES)
  priority?: (typeof PRIORITY_VALUES)[number];

  // [UPDATED] Thêm @Transform để parse chuỗi JSON từ FormData thành Object
  @IsOptional()
  @Transform(({ value }) => {
    // Nếu là string (do FormData gửi lên), thử parse JSON
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return {};
      }
    }
    // Nếu đã là object (trường hợp gửi JSON raw), giữ nguyên
    return value;
  })
  @IsObject()
  custom?: Record<string, any>;

  // --- booking phòng họp ---
  @IsOptional()
  @IsString()
  bookingRoomKey?: string;

  @IsOptional()
  @IsDateString()
  bookingStart?: string;

  @IsOptional()
  @IsDateString()
  bookingEnd?: string;
}