import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { Permission, QuoteStatus } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import {
  QUOTES_REPOSITORY,
  type QuoteRepository,
} from '../../domain/repositories/quote.repository';

// Transiciones válidas del ciclo de vida de una cotización:
//   DRAFT            -> PENDING_APPROVAL (solicitar aprobación)
//   PENDING_APPROVAL -> APPROVED | DRAFT (rechazar y devolver a borrador)
//   APPROVED         -> PAID
//   PAID             -> (terminal)
//
// Se declara explícitamente en vez de permitir cualquier salto porque el dinero
// que la empresa cobre depende de este estado: pasar de DRAFT a PAID en un solo
// PATCH saltaría la aprobación que el negocio exige a ADMIN.
const ALLOWED_TRANSITIONS: Record<QuoteStatus, readonly QuoteStatus[]> = {
  [QuoteStatus.DRAFT]: [QuoteStatus.PENDING_APPROVAL],
  [QuoteStatus.PENDING_APPROVAL]: [QuoteStatus.APPROVED, QuoteStatus.DRAFT],
  [QuoteStatus.APPROVED]: [QuoteStatus.PAID],
  [QuoteStatus.PAID]: [],
};

export interface UpdateQuoteStatusInput {
  actorUserId: string;
  projectId: string;
  quoteId: string;
  status: QuoteStatus;
}

@Injectable()
export class UpdateQuoteStatusUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(QUOTES_REPOSITORY)
    private readonly quoteRepository: QuoteRepository,
  ) {}

  // Cambia el estado de una cotización.
  //
  // La autorización NO es uniforme según el destino: aprobar (y por tanto
  // marcar como pagada) es una decisión comercial reservada a ADMIN/OWNER,
  // mientras que MEMBER puede mover una cotización en su ciclo de trabajo
  // normal. Por eso se pide QUOTE_READ siempre y QUOTE_APPROVE solo cuando el
  // destino es APPROVED o PAID.
  //
  // El projectId viaja hasta el WHERE del UPDATE, así que cambiar el estado de
  // una cotización de otro tenant produce 404 y no modifica nada.
  async execute(input: UpdateQuoteStatusInput): Promise<QuoteEntity> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.QUOTE_READ,
      input.projectId,
    );

    if (this.requiresApproval(input.status)) {
      await this.authorizationService.assertCan(
        input.actorUserId,
        Permission.QUOTE_APPROVE,
        input.projectId,
      );
    }

    // Se lee la cotización antes de escribir para validar la transición. Es un
    // read-then-write sin transacción: el estado de una cotización solo lo
    // cambia un usuario a la vez y la validación de la transición en el propio
    // use-case hace que un doble PATCH concurrente sea idempotente.
    const current = await this.quoteRepository.findByIdInProject(
      input.quoteId,
      input.projectId,
    );

    if (!current) {
      throw new NotFoundException('Quote not found in this project');
    }

    if (current.status === input.status) {
      throw new ConflictException(`Quote is already in status ${input.status}`);
    }

    const allowed = ALLOWED_TRANSITIONS[current.status] ?? [];

    if (!allowed.includes(input.status)) {
      throw new ConflictException(
        `Cannot change quote status from ${current.status} to ${input.status}`,
      );
    }

    const updated = await this.quoteRepository.updateStatusInProject(
      input.quoteId,
      input.projectId,
      { status: input.status },
    );

    if (!updated) {
      throw new NotFoundException('Quote not found in this project');
    }

    return updated;
  }

  // Aprobar y cobrar exigen permiso de aprobación. Un MEMBER puede pedir
  // aprobación y devolver un borrador, pero no aprobar ni marcar como pagado.
  private requiresApproval(target: QuoteStatus): boolean {
    return target === QuoteStatus.APPROVED || target === QuoteStatus.PAID;
  }
}
