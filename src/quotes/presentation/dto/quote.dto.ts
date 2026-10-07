import { ApiProperty } from '@nestjs/swagger';
import { QuoteStatus } from '@flowcommerce/types';

export class QuoteDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ format: 'uuid', description: 'Lead dueño de la cotización' })
  leadId!: string;

  @ApiProperty({ example: 'COT-2026-0001' })
  folio!: string;

  @ApiProperty({ example: 1000, description: 'Importe antes de impuestos' })
  subtotal!: number;

  @ApiProperty({ example: 160, description: 'Impuestos aplicados' })
  tax!: number;

  @ApiProperty({ example: 1160, description: 'subtotal + tax' })
  total!: number;

  @ApiProperty({ enum: QuoteStatus, example: QuoteStatus.DRAFT })
  status!: QuoteStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  creadoEn!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  actualizadoEn!: Date;
}
