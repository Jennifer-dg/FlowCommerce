import { relations, sql } from 'drizzle-orm';
import {
  type PgTableExtraConfigValue,
  boolean,
  check,
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
  // Perfil editable por el propio usuario (PATCH /users/me).
  phone: varchar('phone', { length: 32 }),
  position: varchar('position', { length: 100 }),
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
    // Perfil de facturación: aparece en las cotizaciones del proyecto.
    billingLegalName: varchar('billing_legal_name', { length: 255 }),
    billingTaxId: varchar('billing_tax_id', { length: 32 }),
    billingAddress: text('billing_address'),
    billingPhone: varchar('billing_phone', { length: 32 }),
    billingEmail: varchar('billing_email', { length: 255 }),
    // Ajustes de cotización. Los defaults reproducen el comportamiento previo
    // (IVA 12 % de Guatemala, moneda GTQ, folios COT-000001, 30 días de vigencia).
    // Todo es editable por proyecto con PATCH /projects/:id.
    quoteTaxPercent: numeric('quote_tax_percent', {
      precision: 5,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(12),
    quoteFolioPrefix: varchar('quote_folio_prefix', { length: 16 })
      .notNull()
      .default('COT'),
    quoteValidityDays: integer('quote_validity_days').notNull().default(30),
    quoteDefaultTerms: text('quote_default_terms'),
    currency: varchar('currency', { length: 3 }).notNull().default('GTQ'),
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
    index('projects_slug_idx').on(table.slug),
    check(
      'projects_quote_tax_percent_range',
      sql`${table.quoteTaxPercent} >= 0 AND ${table.quoteTaxPercent} <= 100`,
    ),
    check(
      'projects_quote_validity_days_range',
      sql`${table.quoteValidityDays} >= 1 AND ${table.quoteValidityDays} <= 3650`,
    ),
  ],
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

// Solicitudes de acceso de un no-miembro a un proyecto. Entidad con ámbito de
// tenant: se consulta siempre por project_id, nunca solo por id. Un único
// PENDING por (project_id, email) lo garantiza el índice único parcial.
export const accessRequestStatusEnum = pgEnum('access_request_status', [
  'PENDING',
  'APPROVED',
  'REJECTED',
]);

export const accessRequests = pgTable(
  'access_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    status: accessRequestStatusEnum('status').notNull().default('PENDING'),
    // Cuándo y por quién se resolvió la solicitud (aprobada o rechazada).
    atendidoEn: timestamp('atendido_en', { withTimezone: true, mode: 'date' }),
    atendidoPorUserId: uuid('atendido_por_user_id').references(() => users.id),
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
    // Solo un PENDING por email en cada tenant; una solicitud resuelta puede
    // volver a intentarse (REJECTED → nuevo PENDING).
    uniqueIndex('access_requests_project_email_pending_unique')
      .on(table.projectId, table.email)
      .where(sql`status = 'PENDING'`),
    index('access_requests_project_id_created_at_idx').on(
      table.projectId,
      table.createdAt,
    ),
  ],
);

export const accessRequestsRelations = relations(accessRequests, ({ one }) => ({
  project: one(projects, {
    fields: [accessRequests.projectId],
    references: [projects.id],
  }),
  atendidoPor: one(users, {
    fields: [accessRequests.atendidoPorUserId],
    references: [users.id],
  }),
}));

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
  'NEGOTIATION',
  'WON',
  'LOST',
]);

export const leadSourceEnum = pgEnum('lead_source', [
  'REFERRAL',
  'WEBSITE',
  'WHATSAPP',
  'SOCIAL_MEDIA',
  'EVENT',
  'COLD_OUTREACH',
  'OTHER',
]);

export const quoteStatusEnum = pgEnum('quote_status', [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'SENT',
  'ACCEPTED',
  'PAID',
  'REJECTED',
]);

export const messageDirectionEnum = pgEnum('message_direction', [
  'INBOUND',
  'OUTBOUND',
]);

/* ------------------------------------------------------------------ */
/* Catálogo de productos y servicios                                   */
/* ------------------------------------------------------------------ */

// Catálogo oficial de precios del proyecto. Se desactiva (active = false), nunca
// se borra: las partidas de cotización que lo citan deben sobrevivir.
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),
    // Unidad de venta legible ("usuario", "sesión de 4 horas").
    unit: varchar('unit', { length: 50 }),
    // Precio unitario ANTES de IVA, decimal exacto.
    price: numeric('price', { precision: 14, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
    // Descuento máximo permitido al cotizar este producto (0–100).
    maxDiscountPercent: numeric('max_discount_percent', {
      precision: 5,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    active: boolean('active').notNull().default(true),
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
    // El nombre es único dentro del catálogo del tenant.
    uniqueIndex('products_project_id_name_unique').on(
      table.projectId,
      table.name,
    ),
    index('products_project_id_active_idx').on(table.projectId, table.active),
    // Habilita FKs compuestas (product_id, project_id) desde las partidas de
    // cotización: un producto citado debe pertenecer al mismo proyecto.
    unique('products_id_project_id_unique').on(table.id, table.projectId),
    check('products_price_non_negative', sql`${table.price} >= 0`),
    check(
      'products_max_discount_range',
      sql`${table.maxDiscountPercent} >= 0 AND ${table.maxDiscountPercent} <= 100`,
    ),
  ],
);

// Cliente (cuenta) del proyecto. Se consulta siempre por project_id.
export const clients = pgTable(
  'clients',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    // Nombre del contacto principal (o de la persona, si no hay empresa).
    name: varchar('name', { length: 255 }).notNull(),
    company: varchar('company', { length: 255 }),
    // NIT u otro identificador fiscal.
    taxId: varchar('tax_id', { length: 32 }),
    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 32 }),
    notes: text('notes'),
    // Responsable comercial. El use-case valida que sea miembro del proyecto;
    // si el usuario se borra, el cliente queda sin responsable.
    assignedUserId: uuid('assigned_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Lead del que nació el cliente (conversión). Informativo: si el lead se
    // borra, el cliente se conserva. El use-case valida que sea del proyecto.
    sourceLeadId: uuid('source_lead_id'),
    active: boolean('active').notNull().default(true),
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
  (table): PgTableExtraConfigValue[] => [
    index('clients_project_id_idx').on(table.projectId),
    index('clients_project_id_assigned_user_idx').on(
      table.projectId,
      table.assignedUserId,
    ),
    // Un NIT identifica a un solo cliente dentro del tenant.
    uniqueIndex('clients_project_id_tax_id_unique')
      .on(table.projectId, table.taxId)
      .where(sql`tax_id IS NOT NULL`),
    // Habilita FKs compuestas (client_id, project_id) desde leads y quotes.
    unique('clients_id_project_id_unique').on(table.id, table.projectId),
    // FK compuesta: el lead de origen debe ser del MISMO proyecto. NO ACTION:
    // un lead convertido es historial y no se borra.
    foreignKey({
      columns: [table.sourceLeadId, table.projectId],
      foreignColumns: [leads.id, leads.projectId],
      name: 'clients_source_lead_id_project_id_leads_fk',
    }),
  ],
);

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
    company: varchar('company', { length: 255 }),
    source: leadSourceEnum('source'),
    estimatedValue: numeric('estimated_value', {
      precision: 14,
      scale: 2,
      mode: 'number',
    }),
    notes: text('notes'),
    // Responsable. El use-case valida que sea miembro del proyecto.
    assignedUserId: uuid('assigned_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    // Cliente y producto de interés: sin .references() simple, las FKs
    // compuestas de abajo los atan al MISMO proyecto que el lead.
    clientId: uuid('client_id'),
    interestProductId: uuid('interest_product_id'),
    lastContactAt: timestamp('last_contact_at', {
      withTimezone: true,
      mode: 'date',
    }),
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
    index('leads_project_id_assigned_user_idx').on(
      table.projectId,
      table.assignedUserId,
    ),
    index('leads_project_id_client_id_idx').on(table.projectId, table.clientId),
    // Un cliente con leads no se puede borrar (NO ACTION): hay que desactivarlo.
    foreignKey({
      columns: [table.clientId, table.projectId],
      foreignColumns: [clients.id, clients.projectId],
      name: 'leads_client_id_project_id_clients_fk',
    }),
    foreignKey({
      columns: [table.interestProductId, table.projectId],
      foreignColumns: [products.id, products.projectId],
      name: 'leads_interest_product_id_project_id_products_fk',
    }),
    check(
      'leads_estimated_value_non_negative',
      sql`${table.estimatedValue} IS NULL OR ${table.estimatedValue} >= 0`,
    ),
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
    // Cliente al que se cotiza (opcional). Misma garantía de tenant que el
    // lead: la FK compuesta (client_id, project_id) vive en la config de abajo.
    clientId: uuid('client_id'),
    folio: varchar('folio', { length: 64 }).notNull(),
    // Importes calculados por el servidor a partir de las partidas:
    // subtotal (bruto) - discount + tax = total.
    subtotal: numeric('subtotal', {
      precision: 14,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    discount: numeric('discount', {
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
    validUntil: timestamp('valid_until', { withTimezone: true, mode: 'date' }),
    notes: text('notes'),
    terms: text('terms'),
    // Si el usuario se borra, la cotización se conserva sin autor.
    createdByUserId: uuid('created_by_user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    approvedAt: timestamp('approved_at', { withTimezone: true, mode: 'date' }),
    sentAt: timestamp('sent_at', { withTimezone: true, mode: 'date' }),
    acceptedAt: timestamp('accepted_at', { withTimezone: true, mode: 'date' }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true, mode: 'date' }),
    paidAt: timestamp('paid_at', { withTimezone: true, mode: 'date' }),
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
    index('quotes_project_id_client_id_idx').on(
      table.projectId,
      table.clientId,
    ),
    // Habilita la FK compuesta (quote_id, project_id) desde quote_items.
    unique('quotes_id_project_id_unique').on(table.id, table.projectId),
    // Un cliente con cotizaciones no se puede borrar (NO ACTION): se desactiva.
    foreignKey({
      columns: [table.clientId, table.projectId],
      foreignColumns: [clients.id, clients.projectId],
      name: 'quotes_client_id_project_id_clients_fk',
    }),
    // FK compuesta: el lead citado debe vivir en el mismo proyecto.
    foreignKey({
      columns: [table.leadId, table.projectId],
      foreignColumns: [leads.id, leads.projectId],
      name: 'quotes_lead_id_project_id_leads_fk',
    }).onDelete('cascade'),
  ],
);

// Contador de folios por proyecto. Se incrementa con un upsert atómico dentro
// de la transacción que crea la cotización: dos peticiones simultáneas nunca
// obtienen el mismo número.
export const quoteFolioCounters = pgTable('quote_folio_counters', {
  projectId: uuid('project_id')
    .primaryKey()
    .references(() => projects.id, { onDelete: 'cascade' }),
  lastNumber: integer('last_number').notNull().default(0),
});

// Partida de una cotización. Todo lo monetario lo calcula el servidor: el
// precio sale del catálogo y line_total ya descuenta el descuento de la línea.
export const quoteItems = pgTable(
  'quote_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id').notNull(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull(),
    description: text('description').notNull(),
    quantity: numeric('quantity', {
      precision: 14,
      scale: 2,
      mode: 'number',
    }).notNull(),
    unitPrice: numeric('unit_price', {
      precision: 14,
      scale: 2,
      mode: 'number',
    }).notNull(),
    discountPercent: numeric('discount_percent', {
      precision: 5,
      scale: 2,
      mode: 'number',
    })
      .notNull()
      .default(0),
    lineTotal: numeric('line_total', {
      precision: 14,
      scale: 2,
      mode: 'number',
    }).notNull(),
    position: integer('position').notNull(),
  },
  (table) => [
    index('quote_items_quote_id_idx').on(table.quoteId),
    foreignKey({
      columns: [table.quoteId, table.projectId],
      foreignColumns: [quotes.id, quotes.projectId],
      name: 'quote_items_quote_id_project_id_quotes_fk',
    }).onDelete('cascade'),
    foreignKey({
      columns: [table.productId, table.projectId],
      foreignColumns: [products.id, products.projectId],
      name: 'quote_items_product_id_project_id_products_fk',
    }),
    check('quote_items_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'quote_items_discount_range',
      sql`${table.discountPercent} >= 0 AND ${table.discountPercent} <= 100`,
    ),
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
    // NO ACTION a propósito: los mensajes son registro de auditoría y un lead
    // con mensajes no se puede borrar (la base lo impide aunque la aplicación
    // falle o haya una carrera). El proyecto sí los arrastra al borrarse.
    foreignKey({
      columns: [table.leadId, table.projectId],
      foreignColumns: [leads.id, leads.projectId],
      name: 'messages_lead_id_project_id_leads_fk',
    }),
  ],
);

export const productsRelations = relations(products, ({ one }) => ({
  project: one(projects, {
    fields: [products.projectId],
    references: [projects.id],
  }),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  project: one(projects, {
    fields: [leads.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [leads.assignedUserId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [leads.clientId],
    references: [clients.id],
  }),
  interestProduct: one(products, {
    fields: [leads.interestProductId],
    references: [products.id],
  }),
  quotes: many(quotes),
  messages: many(messages),
}));

export const clientsRelations = relations(clients, ({ one }) => ({
  project: one(projects, {
    fields: [clients.projectId],
    references: [projects.id],
  }),
  assignedUser: one(users, {
    fields: [clients.assignedUserId],
    references: [users.id],
  }),
  sourceLead: one(leads, {
    fields: [clients.sourceLeadId],
    references: [leads.id],
  }),
}));

export const quotesRelations = relations(quotes, ({ one, many }) => ({
  project: one(projects, {
    fields: [quotes.projectId],
    references: [projects.id],
  }),
  lead: one(leads, {
    fields: [quotes.leadId],
    references: [leads.id],
  }),
  client: one(clients, {
    fields: [quotes.clientId],
    references: [clients.id],
  }),
  items: many(quoteItems),
}));

export const quoteItemsRelations = relations(quoteItems, ({ one }) => ({
  quote: one(quotes, {
    fields: [quoteItems.quoteId],
    references: [quotes.id],
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
export type QuoteItemRow = typeof quoteItems.$inferSelect;
export type NewQuoteItemRow = typeof quoteItems.$inferInsert;
export type NewQuoteRow = typeof quotes.$inferInsert;
export type MessageRow = typeof messages.$inferSelect;
export type NewMessageRow = typeof messages.$inferInsert;
export type ClientRow = typeof clients.$inferSelect;
export type NewClientRow = typeof clients.$inferInsert;
export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type AccessRequestRow = typeof accessRequests.$inferSelect;
export type NewAccessRequestRow = typeof accessRequests.$inferInsert;
