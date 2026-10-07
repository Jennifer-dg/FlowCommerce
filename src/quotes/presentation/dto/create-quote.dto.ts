import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsUUID, Min } from 'class-validator';

// No se acepta projectId ni status: el projectId lo fija el guard a partir de
// la ruta, y el status inicial lo fuerza el use-case a DRAFT para que una
// cotización no pueda nacer ya aprobada.
export class CreateQuoteDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  leadId!: string;

  @ApiProperty({ example: 'COT-2026-0001', maxLength: 64 })
  @IsString()
  @IsNotEmpty()
  folio!: string;

  @ApiProperty({ example: 1000, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  subtotal!: number;

  @ApiProperty({ example: 160, minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tax!: number;

  // `total` no forma parte del body a propósito: el use-case lo recalcula como
  // subtotal + tax. Aceptarlo permitiría crear cotizaciones cuyo total no
  // cuadra con sus partidas.
}
