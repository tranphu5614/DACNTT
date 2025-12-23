import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { Role } from '../schemas/user.schema';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  @IsEmail()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.toLowerCase().trim() : value,
  )
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  // [ĐÃ CÓ] Trường phòng ban
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  department?: string;

  // [MỚI] Thêm trường số điện thoại
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phoneNumber?: string;

  @IsOptional()
  @IsArray()
  // Logic map roles giữ nguyên
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : String(value).split(',');
    return arr
      .map((v: string) => String(v).trim())
      .map((v: string) => {
        const upper = v.toUpperCase();
        if ((Role as any)[upper]) return (Role as any)[upper] as Role;
        const byValue = (Object.values(Role) as string[]).find(
          (val) => val.toUpperCase() === upper,
        );
        return byValue as Role | undefined;
      })
      .filter(Boolean);
  })
  roles?: Role[];
}