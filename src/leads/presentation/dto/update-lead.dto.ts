import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LeadStage } from '@flowcommerce/types';

// Todos los campos son opcionales: un PATCH solo toca lo que viene. Ningún
// campo acepta projectId ni leadId, así que el cliente no puede mover un lead a
// otro proyecto ni cambiar su identidad por el body.
export class UpdateLeadDto {
  @ApiPropertyOptional({ example: 'Distribuidora El Quetzal S.A.' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  // Un null explícito borra el email. Para distinguir "no tocar" de "borrar" el
  // DTO usa undefined (ausente) frente a null (presente y vacío).
  @ApiPropertyOptional({
    example: 'compras@elquetzal.com',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @IsEmail({}, { message: 'email debe ser una dirección válida' })
  @MaxLength(255)
  email?: string | null;

  @ApiPropertyOptional({ example: '+50255550123', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string | null;

  @ApiPropertyOptional({ enum: LeadStage, example: LeadStage.QUALIFIED })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({ minimum: 0, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
