import { relations } from 'drizzle-orm';
import {
  boolean,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Usuarios del sistema: tabla principal de identidad, gestionada junto a Better Auth.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // Better Auth maps `createdAt` -> `creado_en` at runtime.
  createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('actualizado_en', {
    withTimezone: true,
    mode: 'date',
  })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    token: text('token').notNull().unique(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('sessions_user_id_idx').on(table.userId)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    issuer: text('issuer').notNull(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
      withTimezone: true,
      mode: 'date',
    }),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('accounts_user_id_idx').on(table.userId),
    uniqueIndex('accounts_issuer_account_id_unique').on(
      table.issuer,
      table.accountId,
    ),
  ],
);

export const verifications = pgTable(
  'verifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('verifications_identifier_idx').on(table.identifier)],
);

// Un proyecto es el tenant: agrupa sus miembros y sus recursos.
export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    description: text('description'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('projects_slug_idx').on(table.slug)],
);

// Relación usuario<->proyecto con su rol dentro del tenant.
export const memberships = pgTable(
  'memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).notNull().default('MEMBER'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex('memberships_user_id_project_id_unique').on(
      table.userId,
      table.projectId,
    ),
    index('memberships_user_id_idx').on(table.userId),
    index('memberships_project_id_idx').on(table.projectId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  memberships: many(memberships),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [memberships.projectId],
    references: [projects.id],
  }),
}));

// Recurso de ejemplo con ámbito de tenant: siempre se consulta por project_id.
export const resources = pgTable(
  'resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [index('resources_project_id_idx').on(table.projectId)],
);

export const projectsRelations = relations(projects, ({ many }) => ({
  resources: many(resources),
  leads: many(leads),
}));

export const resourcesRelations = relations(resources, ({ one }) => ({
  project: one(projects, {
    fields: [resources.projectId],
    references: [projects.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const verificationsRelations = relations(verifications, () => ({}));

/* ------------------------------------------------------------------ */
/* CRM: leads, quotes y mensajes                                       */
/* ------------------------------------------------------------------ */

// Etapas del embudo comercial. Se declara como enum de Postgres (y no como
// varchar) para que la base imponga los valores: un stage inválido no llega
// ni a insertarse, ni aunque alguien escriba por SQL.
export const leadStageEnum = pgEnum('lead_stage', [
  'NEW',
  'CONTACTED',
  'QUALIFIED',
  'PROPOSAL',
  'WON',
  'LOST',
]);

export const quoteStatusEnum = pgEnum('quote_status', [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'PAID',
]);

export const messageDirectionEnum = pgEnum('message_direction', [
  'INBOUND',
  'OUTBOUND',
]);

// Lead (cliente potencial) con ámbito de tenant: se consulta siempre por
// project_id, nunca solo por id.
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    // varchar(255) y no text para poder indexar y comparar, igual que
    // users.email dentro de este mismo esquema.
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    stage: leadStageEnum('stage').notNull().default('NEW'),
    score: integer('score').notNull().default(0),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('leads_project_id_idx').on(table.projectId),
    index('leads_project_id_stage_idx').on(table.projectId, table.stage),
    index('leads_project_id_email_idx').on(table.projectId, table.email),
    index('leads_created_at_idx').on(table.createdAt),
    // Unicidad COMPUESTA (constraint, no índice suelto) que habilita las FK
    // compuestas de quotes y messages: garantiza en la base que un lead citado
    // por una cotización o un mensaje pertenece al MISMO proyecto que esa fila.
    // Postgres exige que la constraint exista antes de añadir la FK, y
    // `unique()` la emite dentro del CREATE TABLE, que es justo lo que necesita.
    unique('leads_id_project_id_unique').on(table.id, table.projectId),
  ],
);

// Cotización de un lead. El dinero usa numeric(14,2) en Postgres, que es
// decimal exacto: no debe calcularse nunca en coma flotante JavaScript.
// Se lee con mode:'number' solo para la respuesta JSON; la suma de total
// debe delegarse en SQL (subtotal + tax) para no perder precisión.
export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Sin .references() simple: la integridad de tenant la impone la FK
    // compuesta de abajo, que ata (lead_id, project_id) a (leads.id,
    // leads.project_id). Así es imposible colgar una cotización de un lead de
    // otro proyecto, aunque el código de aplicación se equivoque.
    leadId: uuid('lead_id').notNull(),
    folio: varchar('folio', { length: 64 }).notNull(),
    subtotal: numeric('subtotal', {
      precision: 14,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    tax: numeric('tax', { precision: 14, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
    total: numeric('total', { precision: 14, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
    status: quoteStatusEnum('status').notNull().default('DRAFT'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('actualizado_en', {
      withTimezone: true,
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    // El folio es único dentro del tenant, no globalmente: dos empresas
    // pueden numerar sus cotizaciones igual.
    uniqueIndex('quotes_project_id_folio_unique').on(
      table.projectId,
      table.folio,
    ),
    index('quotes_project_id_idx').on(table.projectId),
    index('quotes_lead_id_idx').on(table.leadId),
    // FK compuesta: el lead citado debe vivir en el mismo proyecto.
    foreignKey({
      columns: [table.leadId, table.projectId],
      foreignColumns: [leads.id, leads.projectId],
      name: 'quotes_lead_id_project_id_leads_fk',
    }).onDelete('cascade'),
  ],
);

// Mensaje de WhatsApp. Solo tiene createdAt a propósito: es un registro
// inmutable de auditoría, no una entidad editable, así que no lleva updatedAt.
export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Misma criterio que quotes: la FK compuesta de abajo ata el lead al mismo
    // proyecto que el mensaje.
    leadId: uuid('lead_id').notNull(),
    // Id que asigna la API de WhatsApp. Es la clave de idempotencia: el
    // webhook puede reenviar el mismo mensaje y no debe duplicarlo.
    whatsappMessageId: varchar('whatsapp_message_id', {
      length: 255,
    }).notNull(),
    direction: messageDirectionEnum('direction').notNull(),
    content: text('content').notNull(),
    status: varchar('status', { length: 32 }).notNull().default('SENT'),
    createdAt: timestamp('creado_en', { withTimezone: true, mode: 'date' })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('messages_whatsapp_message_id_unique').on(
      table.whatsappMessageId,
    ),
    index('messages_project_id_idx').on(table.projectId),
    index('messages_lead_id_idx').on(table.leadId),
    index('messages_project_id_direction_idx').on(
      table.projectId,
      table.direction,
    ),
    foreignKey({
      columns: [table.leadId, table.projectId],
      foreignColumns: [leads.id, leads.projectId],
      name: 'messages_lead_id_project_id_leads_fk',
    }).onDelete('cascade'),
  ],
);

export const leadsRelations = relations(leads, ({ one, many }) => ({
  project: one(projects, {
    fields: [leads.projectId],
    references: [projects.id],
  }),
  quotes: many(quotes),
  messages: many(messages),
}));

export const quotesRelations = relations(quotes, ({ one }) => ({
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  lead: one(leads, {
    fields: [quotes.leadId],
    references: [leads.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
  lead: one(leads, {
    fields: [messages.leadId],
    references: [leads.id],
  }),
}));

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type AccountRow = typeof accounts.$inferSelect;
export type VerificationRow = typeof verifications.$inferSelect;
export type ProjectRow = typeof projects.$inferSelect;
export type NewProjectRow = typeof projects.$inferInsert;
export type MembershipRow = typeof memberships.$inferSelect;
export type NewMembershipRow = typeof memberships.$inferInsert;
export type ResourceRow = typeof resources.$inferSelect;
export type NewResourceRow = typeof resources.$inferInsert;
export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
export type QuoteRow = typeof quotes.$inferSelect;
export type NewQuoteRow = typeof quotes.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
