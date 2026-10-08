import { ApiProperty } from '@nestjs/swagger';
import { QuoteDto } from './quote.dto';

export class PaginationMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;

  @ApiProperty({ example: 137 })
  total!: number;

  @ApiProperty({ example: 7 })
  totalPages!: number;
}

// Envelope de los listados paginados: los datos en "data" y el tamaño de la
// respuesta en "meta", para que el cliente no tenga que deducirlo del array.
export class PaginatedQuotesDto {
  @ApiProperty({ type: QuoteDto, isArray: true })
  data!: QuoteDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
