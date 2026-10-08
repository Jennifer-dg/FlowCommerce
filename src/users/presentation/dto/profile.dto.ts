import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UserProfileDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ example: '+57 300 123 4567', nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ example: 'Gerente comercial', nullable: true })
  position!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}

// Solo teléfono y puesto. El correo y el nombre se gestionan por Better Auth.
export class UpdateProfileDto {
  @ApiPropertyOptional({ example: '+57 300 123 4567', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ example: 'Gerente comercial', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string | null;
}
