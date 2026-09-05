import type {
  Project,
  Resource,
  Role,
  SafeUser,
  UserMembership,
} from '@flowcommerce/types';

export interface SignUpRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SafeUser;
}

export interface CreateProjectRequest {
  name: string;
  slug: string;
  description?: string | null;
}

export type ProjectResponse = Project;

export interface AddMemberRequest {
  userId: string;
  role: Role;
}

export interface MemberResponse {
  id: string;
  userId: string;
  projectId: string;
  role: Role;
  name: string;
  email: string;
}

export interface MembershipListResponse {
  members: MemberResponse[];
}

export interface AssignRoleRequest {
  role: Role;
}

export interface MyProjectsResponse {
  projects: UserMembership[];
}

export interface CreateResourceRequest {
  name: string;
  description?: string | null;
}

export interface UpdateResourceRequest {
  name?: string;
  description?: string | null;
}

export type ResourceResponse = Resource;

export interface ResourceListResponse {
  resources: ResourceResponse[];
}
