import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { and, eq, inArray } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import type { Database } from '../src/db';
import { DATABASE_CLIENT } from '../src/db/database.constants';
import { leads, memberships, projects, quotes, users } from '../src/db/schema';
import { SESSION_MANAGER } from '../src/auth/application/ports/session-manager';

describe('Quotes (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;

  // Subconjunto de la respuesta que usan las aserciones.
  interface QuoteBody {
    id: string;
    status: string;
    total: number;
    folio: string;
  }

  const now = new Date();
  const future = new Date(now.getTime() + 60_000);

  const ownerA = randomUUID();
  const memberA = randomUUID();
  const ownerB = randomUUID();

  const projectA = randomUUID();
  const projectB = randomUUID();

  const leadA = randomUUID();
  const leadB = randomUUID();

  const userOf = (id: string) => ({
    id,
    name: 'Seed User',
    email: `quote-${id}@flowcommerce.test`,
  });

  const sessionManager = {
    signUp: jest.fn(),
    signIn: jest.fn(),
    getSession: jest.fn(),
    signOut: jest.fn(),
  };

  const cookie = (userId: string) =>
    `flowcommerce.session_token=user.${userId}`;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SESSION_MANAGER)
      .useValue(sessionManager)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();

    sessionManager.getSession.mockImplementation((headers: Headers) => {
      const value = headers.get('cookie') ?? '';
      const match = /user\.([0-9a-f-]{36})/i.exec(value);
      const userId = match?.[1];
      if (!userId) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        user: { ...userOf(userId), creadoEn: now, actualizadoEn: now },
        session: {
          id: `session-${userId}`,
          userId,
          expiresAt: future,
        },
      });
    });

    db = app.get(DATABASE_CLIENT);

    await db.delete(quotes).where(eq(quotes.projectId, projectA));
    await db.delete(quotes).where(eq(quotes.projectId, projectB));
    await db.delete(leads).where(inArray(leads.id, [leadA, leadB]));
    await db
      .delete(memberships)
      .where(inArray(memberships.userId, [ownerA, memberA, ownerB]));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db.delete(users).where(inArray(users.id, [ownerA, memberA, ownerB]));

    await db
      .insert(users)
      .values([userOf(ownerA), userOf(memberA), userOf(ownerB)]);

    await db.insert(projects).values([
      { id: projectA, name: 'Quotes A', slug: `qa-${ownerA}` },
      { id: projectB, name: 'Quotes B', slug: `qb-${ownerB}` },
    ]);

    await db.insert(memberships).values([
      { id: randomUUID(), userId: ownerA, projectId: projectA, role: 'OWNER' },
      {
        id: randomUUID(),
        userId: memberA,
        projectId: projectA,
        role: 'MEMBER',
      },
      { id: randomUUID(), userId: ownerB, projectId: projectB, role: 'OWNER' },
    ]);

    await db.insert(leads).values([
      { id: leadA, projectId: projectA, name: 'Lead A' },
      { id: leadB, projectId: projectB, name: 'Lead B' },
    ]);
  });

  afterAll(async () => {
    await db.delete(quotes).where(eq(quotes.projectId, projectA));
    await db.delete(quotes).where(eq(quotes.projectId, projectB));
    await db.delete(leads).where(inArray(leads.id, [leadA, leadB]));
    await db
      .delete(memberships)
      .where(inArray(memberships.userId, [ownerA, memberA, ownerB]));
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db.delete(users).where(inArray(users.id, [ownerA, memberA, ownerB]));
    await app.close();
  });

  // Crea una cotización vía HTTP y devuelve sus campos tipados.
  const createQuote = async (body: Record<string, unknown>, as = ownerA) => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/quotes`)
      .set('Cookie', cookie(as))
      .send(body)
      .expect(201);

    return response.body as QuoteBody;
  };

  // Igual, pero en un proyecto arbitrario. supertest tipa `body` como `any`, así
  // que sin esta conversión cada `.body.id` dispara no-unsafe-member-access.
  const createQuoteIn = async (
    projectId: string,
    body: Record<string, unknown>,
    as: string,
  ) => {
    const response = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectId}/quotes`)
      .set('Cookie', cookie(as))
      .send(body)
      .expect(201);

    return response.body as QuoteBody;
  };

  describe('create', () => {
    it('creates a DRAFT quote and recomputes the total', async () => {
      const quote = await createQuote({
        leadId: leadA,
        folio: 'COT-1',
        subtotal: 1000,
        tax: 160,
      });

      expect(quote.status).toBe('DRAFT');
      expect(quote.total).toBe(1160);
    });

    it('ignores a client-supplied status or total', async () => {
      // forbidNonWhitelisted está activo: mandar status o total debe fallar, no
      // ignorarse en silencio. La garantía de que el total no se manipula la
      // da el use-case, y esto demuestra que el body ni siquiera los admite.
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectA}/quotes`)
        .set('Cookie', cookie(ownerA))
        .send({
          leadId: leadA,
          folio: 'COT-2',
          subtotal: 1000,
          tax: 160,
          status: 'APPROVED',
        })
        .expect(400);

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectA}/quotes`)
        .set('Cookie', cookie(ownerA))
        .send({
          leadId: leadA,
          folio: 'COT-3',
          subtotal: 1000,
          tax: 160,
          total: 1,
        })
        .expect(400);
    });

    it('refuses to hang a quote off a lead of another project', async () => {
      // Sin la comprobación del use-case, la FK compuesta rechazaría la
      // inserción con un 500. Se espera un 404 limpio e indistinguible.
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectA}/quotes`)
        .set('Cookie', cookie(ownerA))
        .send({ leadId: leadB, folio: 'COT-X', subtotal: 10, tax: 1 })
        .expect(404);

      const rows = await db
        .select({ folio: quotes.folio })
        .from(quotes)
        .where(eq(quotes.folio, 'COT-X'));
      expect(rows).toHaveLength(0);
    });

    it('returns 409 for a duplicate folio inside the same project', async () => {
      await createQuote({ leadId: leadA, folio: 'DUP', subtotal: 10, tax: 1 });

      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectA}/quotes`)
        .set('Cookie', cookie(ownerA))
        .send({ leadId: leadA, folio: 'DUP', subtotal: 10, tax: 1 })
        .expect(409);
    });

    it('allows the same folio in a different project', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectB}/quotes`)
        .set('Cookie', cookie(ownerB))
        .send({ leadId: leadB, folio: 'DUP', subtotal: 10, tax: 1 })
        .expect(201);
    });

    it('rejects negative amounts', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectA}/quotes`)
        .set('Cookie', cookie(ownerA))
        .send({ leadId: leadA, folio: 'NEG', subtotal: -5, tax: 0 })
        .expect(400);
    });
  });

  describe('read', () => {
    it('lists and paginates quotes of the tenant', async () => {
      // Se crean 3 garantías para que la primera página (limit=2) no coincida
      // con el total y la paginación sea comprobable de verdad.
      for (const folio of ['PAGE-1', 'PAGE-2', 'PAGE-3']) {
        await createQuote({ leadId: leadA, folio, subtotal: 10, tax: 1 });
      }

      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectA}/quotes?page=1&limit=2`)
        .set('Cookie', cookie(ownerA))
        .expect(200);

      const body = response.body as {
        data: { folio: string }[];
        meta: { limit: number; total: number; totalPages: number };
      };
      expect(body.data).toHaveLength(2);
      expect(body.meta.limit).toBe(2);
      // El total cuenta TODAS las filas del tenant, no solo las de la página.
      expect(body.meta.total).toBeGreaterThan(2);
      expect(body.meta.totalPages).toBe(Math.ceil(body.meta.total / 2));

      // La segunda página trae filas distintas, no una repetición.
      const second = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectA}/quotes?page=2&limit=2`)
        .set('Cookie', cookie(ownerA))
        .expect(200);

      const secondBody = second.body as {
        data: { id: string; folio: string }[];
      };
      const firstFolios = new Set(body.data.map((quote) => quote.folio));
      const overlap = secondBody.data.filter((quote) =>
        firstFolios.has(quote.folio),
      );
      expect(overlap).toHaveLength(0);
    });

    it('filters by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectA}/quotes?status=DRAFT`)
        .set('Cookie', cookie(ownerA))
        .expect(200);

      const body = response.body as { data: { status: string }[] };
      expect(body.data.every((quote) => quote.status === 'DRAFT')).toBe(true);
    });

    it('returns 404 for a quote of another tenant', async () => {
      const foreign = await createQuoteIn(
        projectB,
        { leadId: leadB, folio: 'B-1', subtotal: 10, tax: 1 },
        ownerB,
      );

      await request(app.getHttpServer())
        .get(`/api/v1/projects/${projectA}/quotes/${foreign.id}`)
        .set('Cookie', cookie(ownerA))
        .expect(404);
    });
  });

  describe('status lifecycle', () => {
    it('walks DRAFT -> PENDING_APPROVAL -> APPROVED -> PAID', async () => {
      const quote = await createQuote({
        leadId: leadA,
        folio: 'LIFE-1',
        subtotal: 100,
        tax: 16,
      });

      const step = async (status: string, expectStatus: number) => {
        const response = await request(app.getHttpServer())
          .patch(`/api/v1/projects/${projectA}/quotes/${quote.id}/status`)
          .set('Cookie', cookie(ownerA))
          .send({ status })
          .expect(expectStatus);
        return response.body as { status: string };
      };

      expect((await step('PENDING_APPROVAL', 200)).status).toBe(
        'PENDING_APPROVAL',
      );
      expect((await step('APPROVED', 200)).status).toBe('APPROVED');
      expect((await step('PAID', 200)).status).toBe('PAID');

      // PAID es terminal: no hay salida.
      await step('APPROVED', 409);
    });

    it('rejects skipping approval', async () => {
      const quote = await createQuote({
        leadId: leadA,
        folio: 'LIFE-2',
        subtotal: 100,
        tax: 16,
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectA}/quotes/${quote.id}/status`)
        .set('Cookie', cookie(ownerA))
        .send({ status: 'PAID' })
        .expect(409);

      const rows = await db
        .select({ status: quotes.status })
        .from(quotes)
        .where(eq(quotes.id, quote.id));
      expect(rows[0]?.status).toBe('DRAFT');
    });

    it('lets MEMBER request approval but not approve', async () => {
      const quote = await createQuote({
        leadId: leadA,
        folio: 'LIFE-3',
        subtotal: 100,
        tax: 16,
      });

      // MEMBER sí mueve la cotización en su ciclo de trabajo.
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectA}/quotes/${quote.id}/status`)
        .set('Cookie', cookie(memberA))
        .send({ status: 'PENDING_APPROVAL' })
        .expect(200);

      // Pero aprobar es una decisión comercial: requiere QUOTE_APPROVE, que
      // MEMBER no tiene. Aquí el 403 viene del use-case, no del guard.
      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectA}/quotes/${quote.id}/status`)
        .set('Cookie', cookie(memberA))
        .send({ status: 'APPROVED' })
        .expect(403);

      const rows = await db
        .select({ status: quotes.status })
        .from(quotes)
        .where(eq(quotes.id, quote.id));
      expect(rows[0]?.status).toBe('PENDING_APPROVAL');
    });

    it('returns 404 and writes nothing for a quote of another tenant', async () => {
      const foreign = await createQuoteIn(
        projectB,
        { leadId: leadB, folio: 'B-2', subtotal: 10, tax: 1 },
        ownerB,
      );

      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectA}/quotes/${foreign.id}/status`)
        .set('Cookie', cookie(ownerA))
        .send({ status: 'PENDING_APPROVAL' })
        .expect(404);

      const rows = await db
        .select({ status: quotes.status })
        .from(quotes)
        .where(and(eq(quotes.id, foreign.id), eq(quotes.projectId, projectB)));
      expect(rows[0]?.status).toBe('DRAFT');
    });

    it('rejects an unknown status with 400', async () => {
      const quote = await createQuote({
        leadId: leadA,
        folio: 'LIFE-4',
        subtotal: 100,
        tax: 16,
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/projects/${projectA}/quotes/${quote.id}/status`)
        .set('Cookie', cookie(ownerA))
        .send({ status: 'WHATEVER' })
        .expect(400);
    });
  });

  describe('cascade', () => {
    it('deletes quotes when their lead is deleted', async () => {
      const leadResponse = await request(app.getHttpServer())
        .post(`/api/v1/projects/${projectA}/leads`)
        .set('Cookie', cookie(ownerA))
        .send({ name: 'Cascade lead' })
        .expect(201);
      const leadIdForCascade = (leadResponse.body as { id: string }).id;

      const quote = await createQuote({
        leadId: leadIdForCascade,
        folio: 'CASCADE-1',
        subtotal: 50,
        tax: 5,
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/projects/${projectA}/leads/${leadIdForCascade}`)
        .set('Cookie', cookie(ownerA))
        .expect(204);

      // La FK compuesta ON DELETE CASCADE se encarga: no queda ninguna
      // cotización colgando de un lead que ya no existe.
      const rows = await db
        .select({ id: quotes.id })
        .from(quotes)
        .where(eq(quotes.id, quote.id));
      expect(rows).toHaveLength(0);
    });
  });
});
