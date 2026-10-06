import { Inject, Injectable } from '@nestjs/common';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { Permission, QuoteStatus } from '@flowcommerce/types';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  LEADS_REPOSITORY,
  type LeadRepository,
} from '../../../leads/domain/repositories/lead.repository';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import {
  QUOTES_REPOSITORY,
  type QuoteRepository,
} from '../../domain/repositories/quote.repository';

// El use-case NO acepta total ni status desde el controller: recalcula el total
// como subtotal + tax y fuerza el status inicial a DRAFT. Declararlo aquí, en
// vez de en el DTO de HTTP, blinda también a los llamantes internos.
export interface CreateQuoteInput {
  actorUserId: string;
  projectId: string;
  leadId: string;
  folio: string;
  subtotal: number;
  tax: number;
}

@Injectable()
export class CreateQuoteUseCase {
  constructor(
    private readonly authorizationService: AuthorizationService,
    @Inject(QUOTES_REPOSITORY)
    private readonly quoteRepository: QuoteRepository,
    @Inject(LEADS_REPOSITORY)
    private readonly leadRepository: LeadRepository,
  ) {}

  // Crea una cotización tras verificar QUOTE_CREATE.
  //
  // El leadId viene del body, así que hay que comprobar que ese lead pertenece
  // REALMENTE al proyecto. Sin esta comprobación la FK compuesta
  // (lead_id, project_id) rechazaría la inserción con un 500, que le filtra al
  // cliente la forma de la base de datos. Validarlo aquí devuelve un 404 limpio
  // e indistinguible del caso "no existe".
  //
  // El status inicial se fuerza a DRAFT: una cotización no nace aprobada ni
  // pagada aunque el cliente lo pida, para que el flujo de aprobación sea real.
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

    // El total no se toma del cliente: se recalcula a partir de subtotal + tax.
    // Aceptarlo del body permitiría crear cotizaciones incoherentes cuyo total
    // no cuadra con sus partidas, y ese número es el que ve el cliente final.
    const subtotal = input.subtotal;
    const tax = input.tax;
    const total = Number((subtotal + tax).toFixed(2));

    if (total < 0) {
      throw new ConflictException('Quote total cannot be negative');
    }

    try {
      return await this.quoteRepository.create({
        projectId: input.projectId,
        leadId: input.leadId,
        folio: input.folio,
        subtotal,
        tax,
        total,
        status: QuoteStatus.DRAFT,
      });
    } catch (error) {
      // El folio es único por proyecto. Si choca, la restricción de la base es
      // la fuente de verdad y aquí se traduce a un 409 con mensaje útil en vez
      // de dejar escapar un error de PostgreSQL como 500.
      if (this.isUniqueViolation(error)) {
        throw new ConflictException(
          `A quote with folio "${input.folio}" already exists in this project`,
        );
      }
      throw error;
    }
  }

  // Identifica el SQLSTATE 23505 (unique_violation).
  //
  // NO se comprueba solo `error.code`: Drizzle envuelve los errores del driver
  // en un DrizzleQueryError y deja el SQLSTATE real en `error.cause.code`.
  // Comprobar únicamente el nivel superior deja pasar la violación y el cliente
  // recibe un 500 en lugar de un 409. Se recorre la cadena de `cause` porque el
  // nivel de anidamiento depende de la versión de Drizzle.
  private isUniqueViolation(error: unknown): boolean {
    let current = error;
    // Límite alto a propósito: se detiene en cuanto se cicla o se agota.
    for (let depth = 0; depth < 10; depth++) {
      if (typeof current !== 'object' || current === null) {
        return false;
      }

      if ((current as { code?: unknown }).code === '23505') {
        return true;
      }

      if (!('cause' in current)) {
        return false;
      }

      current = (current as { cause?: unknown }).cause;
    }

    return false;
  }
}
