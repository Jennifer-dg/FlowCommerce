import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '../../../common/exceptions/domain.exceptions';
import { MEMBERSHIP_REPOSITORY } from '../../domain/repositories/membership.repository';
import { ListProjectMembersUseCase } from './list-project-members.use-case';

describe('ListProjectMembersUseCase', () => {
  let useCase: ListProjectMembersUseCase;
  const membershipRepository = {
    findById: jest.fn(),
    findMemberById: jest.fn(),
    findByUserAndProject: jest.fn(),
    findMembersByProject: jest.fn(),
    findMyProjects: jest.fn(),
    create: jest.fn(),
    updateRole: jest.fn(),
    delete: jest.fn(),
    countOwners: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListProjectMembersUseCase,
        {
          provide: MEMBERSHIP_REPOSITORY,
          useValue: membershipRepository,
        },
      ],
    }).compile();

    useCase = module.get(ListProjectMembersUseCase);
    jest.clearAllMocks();
  });

  const now = new Date('2026-01-01T00:00:00.000Z');
  const actorId = '11111111-1111-4111-8111-111111111111';
  const projectId = '33333333-3333-4333-8333-333333333333';

  it('returns members for a member actor', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue({
      id: 'actor-membership',
      userId: actorId,
      projectId,
      role: 'VIEWER',
      creadoEn: now,
      actualizadoEn: now,
    });
    membershipRepository.findMembersByProject.mockResolvedValue([
      {
        membership: {
          id: 'm1',
          userId: actorId,
          projectId,
          role: 'VIEWER',
          creadoEn: now,
          actualizadoEn: now,
        },
        userId: actorId,
        name: 'Ada Lovelace',
        email: 'ada@flowcommerce.local',
      },
    ]);

    const result = await useCase.execute({ actorUserId: actorId, projectId });

    expect(result).toHaveLength(1);
    expect(membershipRepository.findMembersByProject).toHaveBeenCalledWith(
      projectId,
    );
  });

  it('rejects a non-member actor', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(null);

    await expect(
      useCase.execute({ actorUserId: actorId, projectId }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.findMembersByProject).not.toHaveBeenCalled();
  });
});
