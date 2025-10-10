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

  @IsOptional()
  @IsArray()
  // chấp nhận cả 'user'/'USER'... và map về enum:
  @Transform(({ value }) => {
    if (!value) return undefined;
    const arr = Array.isArray(value) ? value : String(value).split(',');
    return arr
      .map((v: string) => String(v).trim())
      .map((v: string) => {
        const upper = v.toUpperCase(); // "user" -> "USER"
        // khớp theo key enum
        if ((Role as any)[upper]) return (Role as any)[upper] as Role;
        // khớp theo value enum (phòng khi FE gửi đúng value)
        const byValue = (Object.values(Role) as string[]).find(
          (val) => val.toUpperCase() === upper,
        );
        return byValue as Role | undefined;
      })
      .filter(Boolean);
  })
  roles?: Role[];
}
