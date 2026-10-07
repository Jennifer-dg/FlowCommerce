import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { LeadStage } from '@flowcommerce/types';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

// Filtros y paginación del listado. Todos opcionales: el projectId NO se acepta
// aquí, porque lo fija el guard a partir de la ruta. Aceptarlo en el query
// permitiría a un cliente pedir los leads de otro tenant.
//
// La paginación se hereda del DTO común del proyecto, que ya valida page >= 1 y
// limit entre 1 y 100. Al extenderlo, los query params numéricos siguen
// llegando como number gracias al @Type(() => Number) del padre.
export class ListLeadsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: LeadStage, example: LeadStage.QUALIFIED })
  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  // Búsqueda por texto libre sobre nombre, email y teléfono.
  @ApiPropertyOptional({ example: 'ana', description: 'Coincidencia parcial' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
