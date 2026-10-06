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
} as const;

export type Permission =
  (typeof Permission)[keyof typeof Permission];

export interface Project {
  id: ProjectId;
  name: string;
  slug: string;
  description: string | null;
  creadoEn: Date;
  actualizadoEn: Date;
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

export const LeadStage = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  QUALIFIED: 'QUALIFIED',
  PROPOSAL: 'PROPOSAL',
  WON: 'WON',
  LOST: 'LOST',
} as const;

export type LeadStage = (typeof LeadStage)[keyof typeof LeadStage];

export const QuoteStatus = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  PAID: 'PAID',
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
  creadoEn: Date;
  actualizadoEn: Date;
}

export interface Quote {
  id: QuoteId;
  projectId: ProjectId;
  leadId: LeadId;
  folio: string;
  subtotal: number;
  tax: number;
  total: number;
  status: QuoteStatus;
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
