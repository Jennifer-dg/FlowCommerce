import { Inject, Injectable } from '@nestjs/common';
import { Permission, type Role } from '@flowcommerce/types';
import {
  ForbiddenException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import {
  canAssignRole,
  canManageRole,
} from '../../../authorization/domain/role.rules';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
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
    private readonly authorizationService: AuthorizationService,
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  // Cambia el rol de un miembro respetando las reglas de jerarquía (canManageRole
  // / canAssignRole) y protegiendo al último OWNER del proyecto.
  //
  // Exige MEMBER_UPDATE_ROLE antes de nada (defensa en profundidad) y todas las
  // lecturas/escrituras de la membership objetivo van acotadas por projectId.
  async execute(input: ChangeMemberRoleInput): Promise<ProjectMember> {
    await this.authorizationService.assertCan(
      input.actorUserId,
      Permission.MEMBER_UPDATE_ROLE,
      input.projectId,
    );

    const actorMembership =
      await this.membershipRepository.findByUserAndProject(
        input.actorUserId,
        input.projectId,
      );

    if (!actorMembership) {
      throw new ForbiddenException('You are not a member of this project');
    }

    const targetMembership = await this.membershipRepository.findByIdInProject(
      input.targetMembershipId,
      input.projectId,
    );

    if (!targetMembership) {
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

    const updated = await this.membershipRepository.updateRoleInProject(
      input.targetMembershipId,
      input.projectId,
      input.newRole,
    );

    if (!updated) {
      throw new NotFoundException('Membership not found in this project');
    }

    const member = await this.membershipRepository.findMemberByIdInProject(
      input.targetMembershipId,
      input.projectId,
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
