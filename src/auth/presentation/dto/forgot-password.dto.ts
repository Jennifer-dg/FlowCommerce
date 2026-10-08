import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'mariana.ruiz@flowcommerce.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;
}

// Respuesta idéntica exista o no el correo: el endpoint nunca revela si la
// cuenta está registrada (anti-enumeración de usuarios).
export class ForgotPasswordResponseDto {
  @ApiProperty({ example: true })
  status!: boolean;

  @ApiPropertyOptional({
    example:
      'If this email exists in our system, check your email for the reset link',
  })
  message?: string;
}
