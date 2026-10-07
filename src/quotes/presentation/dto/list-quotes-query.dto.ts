import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { QuoteStatus } from '@flowcommerce/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

// Filtros y paginación del listado. El projectId NO se acepta aquí: lo fija el
// guard a partir de la ruta, y aceptarlo permitiría pedir cotizaciones de otro
// tenant. La paginación se hereda del DTO común (page >= 1, limit entre 1 y 100).
export class ListQuotesQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: QuoteStatus, example: QuoteStatus.APPROVED })
  @IsOptional()
  @IsEnum(QuoteStatus)
  status?: QuoteStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  leadId?: string;
}
