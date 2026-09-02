import { Inject, Injectable } from '@nestjs/common';
import {
  ForbiddenException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { canManageRole } from '../../../authorization/domain/role.rules';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
} from '../../domain/repositories/membership.repository';

export interface RemoveMemberInput {
  actorUserId: string;
  projectId: string;
  targetMembershipId: string;
}

@Injectable()
export class RemoveMemberUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  // Elimina a un miembro del proyecto, protegiendo al último OWNER.
  async execute(input: RemoveMemberInput): Promise<void> {
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

    if (targetMembership.role === 'OWNER') {
      const ownerCount = await this.membershipRepository.countOwners(
        input.projectId,
      );
      if (ownerCount <= 1) {
        throw new ForbiddenException(
          'Cannot remove the last OWNER of the project',
        );
      }
    }

    await this.membershipRepository.delete(input.targetMembershipId);
  }
}
