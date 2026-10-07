import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LeadStage } from '@flowcommerce/types';

export class LeadDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ example: 'Distribuidora El Quetzal' })
  name!: string;

  @ApiPropertyOptional({ nullable: true, example: 'compras@elquetzal.com' })
  email!: string | null;

  @ApiPropertyOptional({ nullable: true, example: '+50255550123' })
  phone!: string | null;

  @ApiProperty({ enum: LeadStage, example: LeadStage.NEW })
  stage!: LeadStage;

  @ApiProperty({ example: 0 })
  score!: number;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}
