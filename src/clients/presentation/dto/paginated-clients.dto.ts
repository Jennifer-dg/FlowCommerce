import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../../leads/presentation/dto/paginated-leads.dto';
import { ClientDto } from './client.dto';

export class PaginatedClientsDto {
  @ApiProperty({ type: ClientDto, isArray: true })
  data!: ClientDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}
