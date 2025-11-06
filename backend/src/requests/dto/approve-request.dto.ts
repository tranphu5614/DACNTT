// backend/src/requests/dto/approve-request.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class ApproveRequestDto {
  @IsOptional()
  @IsString()
  comment?: string;
}
