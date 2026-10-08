import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token de un solo uso recibido por correo' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  token!: string;

  @ApiProperty({ example: 'SecurePassword123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: true })
  status!: boolean;
}

// Respuesta del pre-chequeo del token antes de pintar el formulario.
export class ValidateResetTokenResponseDto {
  @ApiProperty({ example: true })
  valid!: boolean;
}
