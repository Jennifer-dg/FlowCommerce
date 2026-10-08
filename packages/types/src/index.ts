export type UserId = string;
export type ProjectId = string;
export type MembershipId = string;

export const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const Permission = {
  PROJECT_READ: 'PROJECT_READ',
  PROJECT_CREATE: 'PROJECT_CREATE',
  PROJECT_UPDATE: 'PROJECT_UPDATE',
  PROJECT_DELETE: 'PROJECT_DELETE',
  MEMBER_READ: 'MEMBER_READ',
  MEMBER_INVITE: 'MEMBER_INVITE',
  MEMBER_UPDATE_ROLE: 'MEMBER_UPDATE_ROLE',
  MEMBER_REMOVE: 'MEMBER_REMOVE',
  LEAD_CREATE: 'LEAD_CREATE',
  LEAD_READ: 'LEAD_READ',
  LEAD_UPDATE: 'LEAD_UPDATE',
  LEAD_DELETE: 'LEAD_DELETE',
  QUOTE_CREATE: 'QUOTE_CREATE',
  QUOTE_READ: 'QUOTE_READ',
  QUOTE_APPROVE: 'QUOTE_APPROVE',
  WHATSAPP_SEND_MESSAGE: 'WHATSAPP_SEND_MESSAGE',
  PRODUCT_READ: 'PRODUCT_READ',
  PRODUCT_MANAGE: 'PRODUCT_MANAGE',
  CLIENT_CREATE: 'CLIENT_CREATE',
  CLIENT_READ: 'CLIENT_READ',
  CLIENT_UPDATE: 'CLIENT_UPDATE',
  CLIENT_DELETE: 'CLIENT_DELETE',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export interface Project {
  id: ProjectId;
  name: string;
  slug: string;
  description: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

// Perfil de facturación del proyecto (datos fiscales que salen en cotizaciones).
export interface ProjectBillingProfile {
  legalName: string | null;
  taxId: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}

// Ajustes que gobiernan las cotizaciones del proyecto.
export interface ProjectQuoteSettings {
  taxPercent: number;
  folioPrefix: string;
  validityDays: number;
  defaultTerms: string | null;
  currency: string;
}

export interface ProjectDetail extends Project {
  billing: ProjectBillingProfile;
  quoteSettings: ProjectQuoteSettings;
}

export interface Membership {
  id: MembershipId;
  userId: UserId;
  projectId: ProjectId;
  role: Role;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface UserMembership {
  project: Project;
  role: Role;
}

export type ResourceId = string;

export interface Resource {
  id: ResourceId;
  projectId: ProjectId;
  name: string;
  description: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface User {
  id: UserId;
  name: string;
  email: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface SafeUser {
  id: UserId;
  name: string;
  email: string;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface UserProfile extends SafeUser {
  phone: string | null;
  position: string | null;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

/* ------------------------------------------------------------------ */
/* CRM: leads, quotes y mensajes                                       */
/* ------------------------------------------------------------------ */

// Etapas del embudo. Etiquetas del frontend: NEW = Nuevo, CONTACTED =
// Contactado, QUALIFIED = Seguimiento, PROPOSAL = Cotización, NEGOTIATION =
// Negociación, WON = Ganado, LOST = Perdido.
export const LeadStage = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  NEGOTIATION: 'NEGOTIATION',
  WON: 'WON',
  LOST: 'LOST',
} as const;

export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

// Origen del lead (filtro «Fuente» del frontend).
export const LeadSource = {
  REFERRAL: 'REFERRAL',
  WEBSITE: 'WEBSITE',
  WHATSAPP: 'WHATSAPP',
  SOCIAL_MEDIA: 'SOCIAL_MEDIA',
  EVENT: 'EVENT',
  COLD_OUTREACH: 'COLD_OUTREACH',
  OTHER: 'OTHER',
} as const;

export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SENT: 'SENT',
  ACCEPTED: 'ACCEPTED',
  PAID: 'PAID',
  REJECTED: 'REJECTED',
} as const;

export type QuoteStatus = (typeof QuoteStatus)[keyof typeof QuoteStatus];

export const MessageDirection = {
  INBOUND: 'INBOUND',
  OUTBOUND: 'OUTBOUND',
} as const;

export type MessageDirection =
  (typeof MessageDirection)[keyof typeof MessageDirection];

export type LeadId = string;
export type QuoteId = string;
export type MessageId = string;

export interface Lead {
  id: LeadId;
  projectId: ProjectId;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  score: number;
  company: string | null;
  source: LeadSource | null;
  // Valor estimado del negocio (antes de IVA). Suma de activos = pipeline.
  estimatedValue: number | null;
  notes: string | null;
  assignedUserId: UserId | null;
  // Cliente al que pertenece (se fija al convertir el lead).
  clientId: string | null;
  // Producto o servicio de interés, del catálogo del proyecto.
  interestProductId: string | null;
  lastContactAt: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

// Partida de cotización. El precio sale del catálogo; line_total ya descuenta
// el descuento de la línea (antes de IVA).
export interface QuoteItem {
  id: string;
  quoteId: QuoteId;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  lineTotal: number;
  position: number;
}

export interface Quote {
  id: QuoteId;
  projectId: ProjectId;
  leadId: LeadId;
  clientId: string | null;
  folio: string;
  // subtotal (bruto) - discount + tax = total
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: QuoteStatus;
  validUntil: Date | null;
  notes: string | null;
  terms: string | null;
  createdByUserId: UserId | null;
  approvedAt: Date | null;
  sentAt: Date | null;
  acceptedAt: Date | null;
  rejectedAt: Date | null;
  paidAt: Date | null;
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Message {
  id: MessageId;
  projectId: ProjectId;
  leadId: LeadId;
  whatsappMessageId: string;
  direction: MessageDirection;
  content: string;
  status: string;
  creadoEn: Date;
}

/* ------------------------------------------------------------------ */
/* Catálogo de productos y servicios                                   */
/* ------------------------------------------------------------------ */

export type ProductId = string;

// Producto o servicio del catálogo de un proyecto. El precio es la única fuente
// de verdad para cotizar: las partidas de cotización copian nombre y precio en
// el momento de cotizar, así que cambiar el catálogo no altera cotizaciones
// existentes. Un producto se desactiva, nunca se borra.
export interface Product {
  id: ProductId;
  projectId: ProjectId;
  name: string;
  description: string | null;
  category: string | null;
  unit: string | null;
  price: number;
  maxDiscountPercent: number;
  active: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/* ------------------------------------------------------------------ */
/* Clientes                                                            */
/* ------------------------------------------------------------------ */

export type ClientId = string;

// Cliente (cuenta) del proyecto: una empresa o persona con la que ya hay
// relación comercial. Puede nacer de la conversión de un lead (sourceLeadId).
export interface Client {
  id: ClientId;
  projectId: ProjectId;
  name: string;
  company: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  assignedUserId: UserId | null;
  sourceLeadId: LeadId | null;
  active: boolean;
  creadoEn: Date;
  actualizadoEn: Date;
}

/* ------------------------------------------------------------------ */
/* Access requests                                                     */
/* ------------------------------------------------------------------ */

export const AccessRequestStatus = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;

export type AccessRequestStatus =
  (typeof AccessRequestStatus)[keyof typeof AccessRequestStatus];

export type AccessRequestId = string;

export interface AccessRequest {
  id: AccessRequestId;
  projectId: ProjectId;
  email: string;
  status: AccessRequestStatus;
  atendidoEn: Date | null;
  atendidoPorUserId: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
}
