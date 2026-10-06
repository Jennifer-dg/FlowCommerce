import { Test, TestingModule } from '@nestjs/testing';
import { LeadStage, Permission, QuoteStatus } from '@flowcommerce/types';
import {
  ConflictException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import { LEADS_REPOSITORY } from '../../../leads/domain/repositories/lead.repository';
import type { LeadRepository } from '../../../leads/domain/repositories/lead.repository';
import { QuoteEntity } from '../../domain/entities/quote.entity';
import {
  QUOTES_REPOSITORY,
  type QuoteRepository,
} from '../../domain/repositories/quote.repository';
import { CreateQuoteUseCase } from './create-quote.use-case';
import { GetQuoteUseCase } from './get-quote.use-case';
import { ListQuotesUseCase } from './list-quotes.use-case';
import { UpdateQuoteStatusUseCase } from './update-quote-status.use-case';

describe('Quotes use-cases (tenant isolation + status lifecycle)', () => {
  let module: TestingModule;
  const authorizationService = {
    assertCan: jest.fn(),
  };
  const quoteRepository: Record<keyof QuoteRepository, jest.Mock> = {
    findByIdInProject: jest.fn(),
    listByProject: jest.fn(),
    create: jest.fn(),
    updateStatusInProject: jest.fn(),
  };
  const leadRepository: Pick<
    Record<keyof LeadRepository, jest.Mock>,
    'findByIdInProject'
  > = {
    findByIdInProject: jest.fn(),
  };

  const actorId = '11111111-1111-4111-8111-111111111111';
  const projectId = '33333333-3333-4333-8333-333333333333';
  const leadId = '77777777-7777-4777-8777-777777777777';
  const quoteId = '99999999-9999-4999-8999-999999999999';
  const foreignQuoteId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const foreignLeadId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const now = new Date('2026-01-01T00:00:00.000Z');

  const quote = (status: QuoteStatus): QuoteEntity =>
    new QuoteEntity(
      quoteId,
      projectId,
      leadId,
      'COT-2026-0001',
      1000,
      160,
      1160,
      status,
      now,
      now,
    );

  const lead = {
    id: leadId,
    projectId,
    name: 'Ana Torres',
    email: 'ana@example.com',
    phone: null,
    stage: LeadStage.NEW,
    score: 0,
    creadoEn: now,
    actualizadoEn: now,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        CreateQuoteUseCase,
        ListQuotesUseCase,
        GetQuoteUseCase,
        UpdateQuoteStatusUseCase,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
        {
          provide: QUOTES_REPOSITORY,
          useValue: quoteRepository,
        },
        {
          provide: LEADS_REPOSITORY,
          useValue: leadRepository,
        },
      ],
    }).compile();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('creates a DRAFT quote scoped to the project', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      leadRepository.findByIdInProject.mockResolvedValue(lead);
      quoteRepository.create.mockResolvedValue(quote(QuoteStatus.DRAFT));

      const created = await module.get(CreateQuoteUseCase).execute({
        actorUserId: actorId,
        projectId,
        leadId,
        folio: 'COT-2026-0001',
        subtotal: 1000,
        tax: 160,
      });

      expect(created.status).toBe(QuoteStatus.DRAFT);
      expect(quoteRepository.create).toHaveBeenCalledWith({
        projectId,
        leadId,
        folio: 'COT-2026-0001',
        subtotal: 1000,
        tax: 160,
        total: 1160,
        status: QuoteStatus.DRAFT,
      });
      expect(authorizationService.assertCan).toHaveBeenCalledWith(
        actorId,
        Permission.QUOTE_CREATE,
        projectId,
      );
    });

    it('recomputes the total so it cannot be tampered with', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      leadRepository.findByIdInProject.mockResolvedValue(lead);
      quoteRepository.create.mockResolvedValue(quote(QuoteStatus.DRAFT));

      await module.get(CreateQuoteUseCase).execute({
        actorUserId: actorId,
        projectId,
        leadId,
        folio: 'COT-2026-0001',
        subtotal: 333.33,
        tax: 53.33,
      });

      // 386.66 exacto: el redondeo a 2 decimales evita el error de coma flotante.
      expect(quoteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ total: 386.66 }),
      );
    });

    it('refuses to attach a quote to a lead from another project', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      leadRepository.findByIdInProject.mockResolvedValue(null);

      await expect(
        module.get(CreateQuoteUseCase).execute({
          actorUserId: actorId,
          projectId,
          leadId: foreignLeadId,
          folio: 'COT-2026-0001',
          subtotal: 1000,
          tax: 160,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      // La comprobación ocurre ANTES de insertar: no se intenta escribir una
      // fila que la FK compuesta rechazaría.
      expect(quoteRepository.create).not.toHaveBeenCalled();
      // Y el lead se busca siempre dentro del proyecto del actor.
      expect(leadRepository.findByIdInProject).toHaveBeenCalledWith(
        foreignLeadId,
        projectId,
      );
    });

    it('translates a duplicate folio into a 409', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      leadRepository.findByIdInProject.mockResolvedValue(lead);
      // Forma REAL del error: Drizzle envuelve el del driver en un
      // DrizzleQueryError y el SQLSTATE queda en .cause. Si el use-case solo
      // mirara el nivel superior, este test passaría con un mock plano y el
      // e2e fallaría con un 500.
      quoteRepository.create.mockRejectedValue(
        Object.assign(new Error('Failed query: insert into "quotes"'), {
          cause: Object.assign(new Error('duplicate key'), { code: '23505' }),
        }),
      );

      await expect(
        module.get(CreateQuoteUseCase).execute({
          actorUserId: actorId,
          projectId,
          leadId,
          folio: 'COT-2026-0001',
          subtotal: 1000,
          tax: 160,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('translates a duplicate folio when the code is at the top level', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      leadRepository.findByIdInProject.mockResolvedValue(lead);
      quoteRepository.create.mockRejectedValue(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(
        module.get(CreateQuoteUseCase).execute({
          actorUserId: actorId,
          projectId,
          leadId,
          folio: 'COT-2026-0001',
          subtotal: 1000,
          tax: 160,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('rethrows unrelated database errors untouched', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      leadRepository.findByIdInProject.mockResolvedValue(lead);
      // Una FK violada NO es un conflicto de negocio: debe propagarse para que
      // el filtro global la trate como 500, no disfrazarse de 409.
      quoteRepository.create.mockRejectedValue(
        Object.assign(new Error('foreign key violation'), {
          cause: Object.assign(new Error('fk'), { code: '23503' }),
        }),
      );

      await expect(
        module.get(CreateQuoteUseCase).execute({
          actorUserId: actorId,
          projectId,
          leadId,
          folio: 'COT-2026-0001',
          subtotal: 1000,
          tax: 160,
        }),
      ).rejects.toThrow('foreign key violation');
    });

    it('does not persist anything when the actor lacks QUOTE_CREATE', async () => {
      authorizationService.assertCan.mockRejectedValue(new Error('forbidden'));

      await expect(
        module.get(CreateQuoteUseCase).execute({
          actorUserId: actorId,
          projectId,
          leadId,
          folio: 'COT-2026-0001',
          subtotal: 1000,
          tax: 160,
        }),
      ).rejects.toThrow('forbidden');

      expect(quoteRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('list()', () => {
    it('always scopes the query by projectId', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.listByProject.mockResolvedValue({
        quotes: [quote(QuoteStatus.DRAFT)],
        total: 1,
      });

      const result = await module
        .get(ListQuotesUseCase)
        .execute({ actorUserId: actorId, projectId });

      expect(result.quotes).toHaveLength(1);
      expect(quoteRepository.listByProject).toHaveBeenCalledWith(projectId, {
        status: undefined,
        leadId: undefined,
        page: undefined,
        limit: undefined,
      });
    });

    it('keeps the tenant when filters and pagination are applied', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.listByProject.mockResolvedValue({
        quotes: [],
        total: 0,
      });

      await module.get(ListQuotesUseCase).execute({
        actorUserId: actorId,
        projectId,
        status: QuoteStatus.APPROVED,
        leadId,
        page: 3,
        limit: 5,
      });

      expect(quoteRepository.listByProject).toHaveBeenCalledWith(projectId, {
        status: QuoteStatus.APPROVED,
        leadId,
        page: 3,
        limit: 5,
      });
    });
  });

  describe('get()', () => {
    it('resolves a quote scoped to the project', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(
        quote(QuoteStatus.DRAFT),
      );

      const result = await module
        .get(GetQuoteUseCase)
        .execute({ actorUserId: actorId, projectId, quoteId });

      expect(result.id).toBe(quoteId);
      expect(quoteRepository.findByIdInProject).toHaveBeenCalledWith(
        quoteId,
        projectId,
      );
    });

    it('returns 404 for a quote in another project (IDOR)', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(null);

      await expect(
        module.get(GetQuoteUseCase).execute({
          actorUserId: actorId,
          projectId,
          quoteId: foreignQuoteId,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(quoteRepository.findByIdInProject).toHaveBeenCalledWith(
        foreignQuoteId,
        projectId,
      );
    });
  });

  describe('updateStatus()', () => {
    it('allows a normal DRAFT -> PENDING_APPROVAL step with only QUOTE_READ', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(
        quote(QuoteStatus.DRAFT),
      );
      quoteRepository.updateStatusInProject.mockResolvedValue(
        quote(QuoteStatus.PENDING_APPROVAL),
      );

      const result = await module.get(UpdateQuoteStatusUseCase).execute({
        actorUserId: actorId,
        projectId,
        quoteId,
        status: QuoteStatus.PENDING_APPROVAL,
      });

      expect(result.status).toBe(QuoteStatus.PENDING_APPROVAL);
      expect(authorizationService.assertCan).toHaveBeenCalledTimes(1);
      expect(authorizationService.assertCan).toHaveBeenCalledWith(
        actorId,
        Permission.QUOTE_READ,
        projectId,
      );
      expect(quoteRepository.updateStatusInProject).toHaveBeenCalledWith(
        quoteId,
        projectId,
        { status: QuoteStatus.PENDING_APPROVAL },
      );
    });

    it('requires QUOTE_APPROVE to move a quote to APPROVED', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(
        quote(QuoteStatus.PENDING_APPROVAL),
      );
      quoteRepository.updateStatusInProject.mockResolvedValue(
        quote(QuoteStatus.APPROVED),
      );

      await module.get(UpdateQuoteStatusUseCase).execute({
        actorUserId: actorId,
        projectId,
        quoteId,
        status: QuoteStatus.APPROVED,
      });

      expect(authorizationService.assertCan).toHaveBeenNthCalledWith(
        1,
        actorId,
        Permission.QUOTE_READ,
        projectId,
      );
      expect(authorizationService.assertCan).toHaveBeenNthCalledWith(
        2,
        actorId,
        Permission.QUOTE_APPROVE,
        projectId,
      );
    });

    it('rejects a DRAFT -> PAID jump that would skip approval', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(
        quote(QuoteStatus.DRAFT),
      );

      await expect(
        module.get(UpdateQuoteStatusUseCase).execute({
          actorUserId: actorId,
          projectId,
          quoteId,
          status: QuoteStatus.PAID,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(quoteRepository.updateStatusInProject).not.toHaveBeenCalled();
    });

    it('treats PAID as terminal', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(
        quote(QuoteStatus.PAID),
      );

      await expect(
        module.get(UpdateQuoteStatusUseCase).execute({
          actorUserId: actorId,
          projectId,
          quoteId,
          status: QuoteStatus.APPROVED,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(quoteRepository.updateStatusInProject).not.toHaveBeenCalled();
    });

    it('rejects a no-op transition', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(
        quote(QuoteStatus.DRAFT),
      );

      await expect(
        module.get(UpdateQuoteStatusUseCase).execute({
          actorUserId: actorId,
          projectId,
          quoteId,
          status: QuoteStatus.DRAFT,
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(quoteRepository.updateStatusInProject).not.toHaveBeenCalled();
    });

    it('returns 404 and writes nothing for a quote in another project', async () => {
      authorizationService.assertCan.mockResolvedValue(undefined);
      quoteRepository.findByIdInProject.mockResolvedValue(null);

      await expect(
        module.get(UpdateQuoteStatusUseCase).execute({
          actorUserId: actorId,
          projectId,
          quoteId: foreignQuoteId,
          status: QuoteStatus.PENDING_APPROVAL,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(quoteRepository.updateStatusInProject).not.toHaveBeenCalled();
      expect(quoteRepository.findByIdInProject).toHaveBeenCalledWith(
        foreignQuoteId,
        projectId,
      );
    });

    it('does not write anything when the actor lacks QUOTE_READ', async () => {
      authorizationService.assertCan.mockRejectedValue(new Error('forbidden'));

      await expect(
        module.get(UpdateQuoteStatusUseCase).execute({
          actorUserId: actorId,
          projectId,
          quoteId,
          status: QuoteStatus.PENDING_APPROVAL,
        }),
      ).rejects.toThrow('forbidden');

      expect(quoteRepository.updateStatusInProject).not.toHaveBeenCalled();
    });
  });
});
