import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'ada@flowcommerce.local' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password!: string;

  @ApiPropertyOptional({
    example: true,
    default: false,
    description:
      'Recordarme: true mantiene la sesión 7 días aunque se cierre el navegador; false (por defecto) la limita a la sesión del navegador.',
  })
  @IsOptional()
  @IsBoolean()
  rememberMe?: boolean;
}
