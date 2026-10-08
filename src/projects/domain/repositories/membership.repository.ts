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
//
// Toda operación sobre una membership concreta va acotada por projectId
// (`*InProject`): el SQL siempre termina en `WHERE id = ? AND project_id = ?`.
// Un membershipId de otro proyecto se comporta igual que uno inexistente
// (null / false), sin depender de que el use-case compare el projectId.
export interface MembershipRepository {
  findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<MembershipEntity | null>;
  findMemberByIdInProject(
    id: string,
    projectId: string,
  ): Promise<ProjectMember | null>;
  findByUserAndProject(
    userId: string,
    projectId: string,
  ): Promise<MembershipEntity | null>;
  findMembersByProject(projectId: string): Promise<ProjectMember[]>;
  findMyProjects(userId: string): Promise<UserMembership[]>;
  create(input: CreateMembershipInput): Promise<MembershipEntity>;
  // null si la membership no existe en ese proyecto (no se actualiza nada).
  updateRoleInProject(
    id: string,
    projectId: string,
    role: Role,
  ): Promise<MembershipEntity | null>;
  // false si la membership no existe en ese proyecto (no se borra nada).
  deleteInProject(id: string, projectId: string): Promise<boolean>;
  countOwners(projectId: string): Promise<number>;
}

export const MEMBERSHIP_REPOSITORY = Symbol('MEMBERSHIP_REPOSITORY');
