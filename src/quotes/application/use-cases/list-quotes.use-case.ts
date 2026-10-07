import { Inject, Injectable } from '@nestjs/common';
import { Permission, type QuoteStatus } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  QUOTES_REPOSITORY,
  type PaginatedQuotes,
  type QuoteRepository,
} from '../../domain/repositories/quote.repository';

export interface ListQuotesInput {
  actorUserId: string;
  projectId: string;
  status?: QuoteStatus;
  leadId?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ListQuotesUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(QUOTES_REPOSITORY)
    private readonly quoteRepository: QuoteRepository,
  ) {}

  // Lista las cotizaciones del tenant. El projectId es obligatorio y se aplica
  // dentro de la consulta; status y leadId solo pueden reducir el resultado.
  async execute(input: ListQuotesInput): Promise<PaginatedQuotes> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.QUOTE_READ,
      input.projectId,
    );

    return this.quoteRepository.listByProject(input.projectId, {
      status: input.status,
      leadId: input.leadId,
      page: input.page,
      limit: input.limit,
    });
  }
}
