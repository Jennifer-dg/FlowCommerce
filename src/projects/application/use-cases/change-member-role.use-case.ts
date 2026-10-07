import { Inject, Injectable } from '@nestjs/common';
import type { Role } from '@flowcommerce/types';
import {
  ForbiddenException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import {
  canAssignRole,
  canManageRole,
} from '../../../authorization/domain/role.rules';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
  type ProjectMember,
} from '../../domain/repositories/membership.repository';

export interface ChangeMemberRoleInput {
  actorUserId: string;
  projectId: string;
  targetMembershipId: string;
  newRole: Role;
}

@Injectable()
export class ChangeMemberRoleUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  // Cambia el rol de un miembro respetando las reglas de jerarquía (canManageRole
  // / canAssignRole) y protegiendo al último OWNER del proyecto.
  async execute(input: ChangeMemberRoleInput): Promise<ProjectMember> {
    const actorMembership =
      await this.membershipRepository.findByUserAndProject(
        input.actorUserId,
        input.projectId,
      );

    if (!actorMembership) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const targetMembership = await this.membershipRepository.findById(
      input.targetMembershipId,
    );

    if (!targetMembership || targetMembership.projectId !== input.projectId) {
      throw new NotFoundException('Membership not found in this project');
    }

    if (!canManageRole(actorMembership.role, targetMembership.role)) {
      throw new ForbiddenException(
        'Your role cannot manage that member in this project',
      );
    }

    if (!canAssignRole(actorMembership.role, input.newRole)) {
      throw new ForbiddenException(
        'Your role cannot assign that role in this project',
      );
    }

    if (targetMembership.role === 'OWNER' && input.newRole !== 'OWNER') {
      const ownerCount = await this.membershipRepository.countOwners(
        input.projectId,
      );
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot demote the last OWNER of the project',
        );
      }
    }

    const updated = await this.membershipRepository.updateRole(
      input.targetMembershipId,
      input.newRole,
    );

    const member = await this.membershipRepository.findMemberById(
      input.targetMembershipId,
    );

    if (!member) {
      throw new NotFoundException('Membership not found in this project');
    }

    return {
      ...member,
      membership: updated,
    };
  }
}
