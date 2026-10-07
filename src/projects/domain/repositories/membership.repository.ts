import type { Role, UserMembership } from '@flowcommerce/types';
import type { MembershipEntity } from '../entities/membership.entity';

export interface CreateMembershipInput {
  userId: string;
  projectId: string;
  role: Role;
}

export interface ProjectMember {
  membership: MembershipEntity;
  userId: string;
  name: string;
  email: string;
}

// Puerto del repositorio de memberships (lo implementa Drizzle en infraestructura).
export interface MembershipRepository {
  findById(id: string): Promise<MembershipEntity | null>;
  findMemberById(id: string): Promise<ProjectMember | null>;
  findByUserAndProject(
    userId: string,
    projectId: string,
  ): Promise<MembershipEntity | null>;
  findMembersByProject(projectId: string): Promise<ProjectMember[]>;
  findMyProjects(userId: string): Promise<UserMembership[]>;
  create(input: CreateMembershipInput): Promise<MembershipEntity>;
  updateRole(id: string, role: Role): Promise<MembershipEntity>;
  delete(id: string): Promise<void>;
  countOwners(projectId: string): Promise<number>;
}

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');
