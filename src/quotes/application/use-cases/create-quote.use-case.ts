import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  CLIENTS_REPOSITORY,
  type ClientRepository,
} from '../../../clients/domain/repositories/client.repository';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../../leads/domain/repositories/lead.repository';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import {
  QUOTES_REPOSITORY,
  type QuoteRepository,
} from '../../domain/repositories/quote.repository';
import { QuoteItemsBuilder, type QuoteItemInput } from '../quote-items.builder';
import { QuoteSettingsReader } from '../quote-settings.reader';
import { rethrowQuoteReferenceError } from '../quote-reference-errors';

// El use-case NO acepta folio, importes ni status: el folio es correlativo y lo
// genera el servidor, los importes salen del catálogo y el status inicial es
// siempre DRAFT.
export interface CreateQuoteInput {
  actorUserId: string;
  projectId: string;
  leadId: string;
  // Si se omite, se usa el cliente del lead (si tiene).
  clientId?: string | null;
  validUntil?: Date | null;
  notes?: string | null;
  terms?: string | null;
  items?: QuoteItemInput[];
}

@Injectable()
export class CreateQuoteUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(QUOTES_REPOSITORY)
    private readonly quoteRepository: QuoteRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
    @Inject(CLIENTS_REPOSITORY)
    private readonly clientRepository: ClientRepository,
    private readonly itemsBuilder: QuoteItemsBuilder,
    private readonly settingsReader: QuoteSettingsReader,
  ) {}

  // Crea un borrador tras verificar QUOTE_CREATE. Lead, cliente y productos
  // vienen del body, así que se comprueba que pertenecen REALMENTE al proyecto:
  // un id ajeno es indistinguible de uno inexistente (404).
  async execute(input: CreateQuoteInput): Promise<QuoteEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.QUOTE_CREATE,
      input.projectId,
    );

    const lead = await this.leadRepository.findByIdInProject(
      input.leadId,
      input.projectId,
    );
    if (!lead) {
      throw new NotFoundException('Lead not found in this project');
    }

    const clientId =
      input.clientId === undefined ? lead.clientId : input.clientId;
    if (clientId) {
      const client = await this.clientRepository.findByIdInProject(
        clientId,
        input.projectId,
      );
      if (!client) {
        throw new NotFoundException('Client not found in this project');
      }
    }

    const settings = await this.settingsReader.get(input.projectId);

    // Vigencia y condiciones por defecto salen de los ajustes del proyecto; un
    // null explícito en validUntil significa "sin vencimiento".
    const validUntil =
      input.validUntil === undefined
        ? new Date(Date.now() + settings.validityDays * 86_400_000)
        : input.validUntil;

    const { items, totals } = await this.itemsBuilder.build(
      input.projectId,
      input.items ?? [],
    );

    try {
      return await this.quoteRepository.create({
        projectId: input.projectId,
        leadId: input.leadId,
        clientId,
        createdByUserId: input.actorUserId,
        folioPrefix: settings.folioPrefix,
        validUntil,
        notes: input.notes ?? null,
        terms: input.terms === undefined ? settings.defaultTerms : input.terms,
        totals,
        items,
      });
    } catch (error) {
      rethrowQuoteReferenceError(error);
    }
  }
}
