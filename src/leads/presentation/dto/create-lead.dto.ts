import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { LeadStage } from '@flowcommerce/types';

export class CreateLeadDto {
  @ApiProperty({ example: 'Distribuidora El Quetzal' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

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

  @ApiPropertyOptional({
    enum: LeadStage,
    default: LeadStage.NEW,
    example: LeadStage.NEW,
  })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  score?: number;
}
