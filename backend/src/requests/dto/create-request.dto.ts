import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateRequestDto {
  @IsEnum(['HR', 'IT'] as const)
  category!: 'HR' | 'IT';

  @IsString()
  typeKey!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const)
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @IsObject()
  @IsOptional()
  custom?: Record<string, any>;
  // ❌ Không có requester ở đây — BE tự gán từ JWT
}
