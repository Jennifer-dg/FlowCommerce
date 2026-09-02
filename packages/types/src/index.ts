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
  RESOURCE_READ: 'RESOURCE_READ',
  RESOURCE_CREATE: 'RESOURCE_CREATE',
  RESOURCE_UPDATE: 'RESOURCE_UPDATE',
  RESOURCE_DELETE: 'RESOURCE_DELETE',
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
