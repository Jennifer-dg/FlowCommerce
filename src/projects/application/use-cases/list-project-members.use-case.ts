import { Inject, Injectable } from '@nestjs/common';
import { ForbiddenException } from '../../../common/exceptions/domain.exceptions';
import {
  MEMBERSHIP_REPOSITORY,
  type MembershipRepository,
  type ProjectMember,
} from '../../domain/repositories/membership.repository';

export interface ListProjectMembersInput {
  actorUserId: string;
  projectId: string;
}

@Injectable()
export class ListProjectMembersUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY)
    private readonly membershipRepository: MembershipRepository,
  ) {}

  // Devuelve los miembros del proyecto, exigiendo que el actor sea miembro.
  async execute(input: ListProjectMembersInput): Promise<ProjectMember[]> {
    const membership = await this.membershipRepository.findByUserAndProject(
      input.actorUserId,
      input.projectId,
    );

    if (!membership) {
      throw new ForbiddenException('You are not a member of this project');
    }

    return this.membershipRepository.findMembersByProject(input.projectId);
  }
}
