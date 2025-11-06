// backend/src/requests/dto/create-request.dto.ts
import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsDateString,
} from 'class-validator';

const CATEGORY_VALUES = ['HR', 'IT'] as const;
const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

export class CreateRequestDto {
  @IsEnum(CATEGORY_VALUES)
  category!: (typeof CATEGORY_VALUES)[number];

  @IsString()
  typeKey!: string;

  // có form động nên title/description đôi khi FE không gửi → để optional
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PRIORITY_VALUES)
  priority?: (typeof PRIORITY_VALUES)[number];

  // payload động
  @IsObject()
  @IsOptional()
  custom?: Record<string, any>;

  // --- dành cho booking phòng họp (FE có thể gửi thẳng, service sẽ map) ---
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
