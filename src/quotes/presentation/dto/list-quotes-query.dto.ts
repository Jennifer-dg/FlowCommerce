import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { QuoteStatus } from '@flowcommerce/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import {
  QUOTE_SORT_FIELDS,
  type QuoteSortField,
} from '../../domain/repositories/quote.repository';

// Filtros y paginación del listado. El projectId NO se acepta aquí: lo fija el
// guard a partir de la ruta.
export class ListQuotesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QuoteStatus, example: QuoteStatus.APPROVED })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  clientId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  leadId?: string;

  @ApiPropertyOptional({
    example: 'COT-0001',
    description: 'Coincidencia parcial sobre el folio',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  search?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Creadas desde (inclusive)',
  })
  @IsOptional()
  @IsISO8601()
  createdFrom?: string;

  @ApiPropertyOptional({
    format: 'date-time',
    description: 'Creadas antes de (exclusivo)',
  })
  @IsOptional()
  @IsISO8601()
  createdTo?: string;

  @ApiPropertyOptional({
    enum: QUOTE_SORT_FIELDS,
    description: 'Sin sortBy: por fecha de creación ascendente',
  })
  @IsOptional()
  @IsIn(QUOTE_SORT_FIELDS)
  sortBy?: QuoteSortField;

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'asc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';
}
