import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { inArray } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter';
import type { Database } from '../src/db';
import { DATABASE_CLIENT } from '../src/db/database.constants';
import { memberships, projects, resources, users } from '../src/db/schema';
import { SESSION_MANAGER } from '../src/auth/application/ports/session-manager';

describe('Authorization & Multi-tenancy (e2e)', () => {
  let app: INestApplication<App>;
  let db: Database;

  const now = new Date();
  const future = new Date(now.getTime() + 60_000);

  // ---------------------------------------------------------------------------
  // Seed data: two isolated tenants (project A and project B).
  // ---------------------------------------------------------------------------
  const ownerA = randomUUID();
  const adminA = randomUUID();
  const memberA = randomUUID();
  const viewerA = randomUUID();
  const ownerB = randomUUID();

  const projectA = randomUUID();
  const projectB = randomUUID();

  const resourceA = randomUUID();
  const resourceB = randomUUID();

  const userOf = (id: string) => ({
    id,
    name: 'Seed User',
    email: `seed-${id}@flowcommerce.test`,
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

    // Idempotent cleanup for the IDs this suite manages.
    await db
      .delete(resources)
      .where(inArray(resources.id, [resourceA, resourceB]));
    await db
      .delete(memberships)
      .where(
        inArray(memberships.userId, [ownerA, adminA, memberA, viewerA, ownerB]),
      );
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db
      .delete(users)
      .where(inArray(users.id, [ownerA, adminA, memberA, viewerA, ownerB]));

    await db
      .insert(users)
      .values([
        userOf(ownerA),
        userOf(adminA),
        userOf(memberA),
        userOf(viewerA),
        userOf(ownerB),
      ]);

    await db.insert(projects).values([
      { id: projectA, name: 'Project A', slug: `a-${ownerA}` },
      { id: projectB, name: 'Project B', slug: `b-${ownerB}` },
    ]);

    await db.insert(memberships).values([
      { id: randomUUID(), userId: ownerA, projectId: projectA, role: 'OWNER' },
      { id: randomUUID(), userId: adminA, projectId: projectA, role: 'ADMIN' },
      {
        id: randomUUID(),
        userId: memberA,
        projectId: projectA,
        role: 'MEMBER',
      },
      {
        id: randomUUID(),
        userId: viewerA,
        projectId: projectA,
        role: 'VIEWER',
      },
      { id: randomUUID(), userId: ownerB, projectId: projectB, role: 'OWNER' },
    ]);

    await db.insert(resources).values([
      { id: resourceA, projectId: projectA, name: 'Resource A' },
      { id: resourceB, projectId: projectB, name: 'Resource B' },
    ]);
  });

  afterAll(async () => {
    await db
      .delete(resources)
      .where(inArray(resources.id, [resourceA, resourceB]));
    await db
      .delete(memberships)
      .where(
        inArray(memberships.userId, [ownerA, adminA, memberA, viewerA, ownerB]),
      );
    await db.delete(projects).where(inArray(projects.id, [projectA, projectB]));
    await db
      .delete(users)
      .where(inArray(users.id, [ownerA, adminA, memberA, viewerA, ownerB]));
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // 1. Authentication
  // ---------------------------------------------------------------------------

  it('rejects anonymous requests with 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/resources`)
      .expect(401);
  });

  it('allows a MEMBER to list resources of its own tenant', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(memberA))
      .expect(200);

    const body = response.body as { resources?: unknown[] };
    expect(Array.isArray(body)).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 2. Role -> permission matrix over resources
  // ---------------------------------------------------------------------------

  it('lets OWNER create a resource', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(ownerA))
      .send({ name: 'Owned resource' })
      .expect(201);

    expect((created.body as { projectId: string }).projectId).toBe(projectA);
  });

  it('lets MEMBER create a resource but not delete it', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(memberA))
      .send({ name: 'Member resource' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectA}/resources/${resourceA}`)
      .set('Cookie', cookie(memberA))
      .expect(403);
  });

  it('forbids VIEWER from creating a resource (403)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(viewerA))
      .send({ name: 'Viewer resource' })
      .expect(403);
  });

  it('lets VIEWER read resources', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(viewerA))
      .expect(200);
  });

  it('lets ADMIN delete project resources', async () => {
    const created = await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(adminA))
      .send({ name: 'Admins resource' })
      .expect(201);

    await request(app.getHttpServer())
      .delete(
        `/api/v1/projects/${projectA}/resources/${
          (created.body as { id: string }).id
        }`,
      )
      .set('Cookie', cookie(adminA))
      .expect(204);
  });

  // ---------------------------------------------------------------------------
  // 3. Multi-tenancy / BOLA (tenant A user must not reach tenant B)
  // ---------------------------------------------------------------------------

  it('denies access to a project the user is not a member of (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectB}/resources`)
      .set('Cookie', cookie(ownerA))
      .expect(403);
  });

  it('denies the owner of B from listing members of A (403)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/members`)
      .set('Cookie', cookie(ownerB))
      .expect(403);
  });

  // ---------------------------------------------------------------------------
  // 4. IDOR: knowing another tenant's resource id must not grant access
  // ---------------------------------------------------------------------------

  it('returns 404 when fetching a resource from another tenant by id', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/resources/${resourceB}`)
      .set('Cookie', cookie(ownerA))
      .expect(404);
  });

  it('returns 404 when updating a resource from another tenant', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectA}/resources/${resourceB}`)
      .set('Cookie', cookie(adminA))
      .send({ name: 'Hijacked' })
      .expect(404);
  });

  it('returns 404 when deleting a resource from another tenant', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectA}/resources/${resourceB}`)
      .set('Cookie', cookie(ownerA))
      .expect(404);
  });

  it('does not leak resources from other tenants in list()', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/resources`)
      .set('Cookie', cookie(memberA))
      .expect(200);

    const body = response.body as { id: string }[];
    expect(body.some((resource) => resource.id === resourceB)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // 5. Ownership rules (project A: ownerA is the single OWNER)
  // ---------------------------------------------------------------------------

  it('blocks demoting the last OWNER (403)', async () => {
    const membership = (await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/members`)
      .set('Cookie', cookie(ownerA))
      .expect(200)) as unknown as {
      body: { id: string; userId: string; role: string }[];
    };

    const ownerMembership = membership.body.find(
      (member) => member.userId === ownerA,
    );
    expect(ownerMembership?.role).toBe('OWNER');

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectA}/members/${ownerMembership!.id}`)
      .set('Cookie', cookie(ownerA))
      .send({ role: 'MEMBER' })
      .expect(403);
  });

  it('blocks removing the last OWNER (403)', async () => {
    const membership = (await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/members`)
      .set('Cookie', cookie(ownerA))
      .expect(200)) as unknown as { body: { id: string; userId: string }[] };

    const ownerMembership = membership.body.find(
      (member) => member.userId === ownerA,
    );

    await request(app.getHttpServer())
      .delete(`/api/v1/projects/${projectA}/members/${ownerMembership!.id}`)
      .set('Cookie', cookie(ownerA))
      .expect(403);
  });

  it('prevents ADMIN from managing the OWNER (403)', async () => {
    const membership = (await request(app.getHttpServer())
      .get(`/api/v1/projects/${projectA}/members`)
      .set('Cookie', cookie(ownerA))
      .expect(200)) as unknown as { body: { id: string; userId: string }[] };

    const ownerMembership = membership.body.find(
      (member) => member.userId === ownerA,
    );

    await request(app.getHttpServer())
      .patch(`/api/v1/projects/${projectA}/members/${ownerMembership!.id}`)
      .set('Cookie', cookie(adminA))
      .send({ role: 'MEMBER' })
      .expect(403);
  });

  it('prevents VIEWER from inviting members (403)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/projects/${projectA}/members`)
      .set('Cookie', cookie(viewerA))
      .send({ userId: randomUUID(), role: 'MEMBER' })
      .expect(403);
  });
});
