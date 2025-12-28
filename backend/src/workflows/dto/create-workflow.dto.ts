import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsBoolean, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class WorkflowStepDto {
  @IsNumber()
  @IsNotEmpty()
  level!: number; // Thêm dấu !

  @IsString()
  @IsNotEmpty()
  role!: string;  // Thêm dấu !
}

export class CreateWorkflowDto {
  @IsString()
  @IsNotEmpty()
  typeKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowStepDto)
  steps!: WorkflowStepDto[];
}