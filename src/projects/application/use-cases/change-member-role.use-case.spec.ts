import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { MEMBERSHIP_REPOSITORY } from '../../domain/repositories/membership.repository';
import { ChangeMemberRoleUseCase } from './change-member-role.use-case';

describe('ChangeMemberRoleUseCase', () => {
  let useCase: ChangeMemberRoleUseCase;
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
        ChangeMemberRoleUseCase,
        {
          provide: MEMBERSHIP_REPOSITORY,
          useValue: membershipRepository,
        },
      ],
    }).compile();

    useCase = module.get(ChangeMemberRoleUseCase);
    jest.clearAllMocks();
  });

  const now = new Date('2026-01-01T00:00:00.000Z');
  const actorId = '11111111-1111-4111-8111-111111111111';
  const projectId = '33333333-3333-4333-8333-333333333333';
  const targetMembershipId = '44444444-4444-4444-8444-444444444444';

  const membership = (
    role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER',
    id = targetMembershipId,
    memberId = '22222222-2222-4222-8222-222222222222',
  ) => ({
    id,
    userId: memberId,
    projectId,
    role,
    creadoEn: now,
    actualizadoEn: now,
  });

  const baseActor = (role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') =>
    membership(role, 'actor-membership', actorId);

  it('lets an OWNER change a MEMBER to ADMIN', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue(membership('MEMBER'));
    membershipRepository.updateRole.mockResolvedValue(membership('ADMIN'));
    membershipRepository.findMemberById.mockResolvedValue({
      membership: membership('ADMIN'),
      userId: '22222222-2222-4222-8222-222222222222',
      name: 'Ada Lovelace',
      email: 'ada@flowcommerce.local',
    });

    const result = await useCase.execute({
      actorUserId: actorId,
      projectId,
      targetMembershipId,
      newRole: 'ADMIN',
    });

    expect(result.membership.role).toBe('ADMIN');
    expect(membershipRepository.updateRole).toHaveBeenCalledWith(
      targetMembershipId,
      'ADMIN',
    );
  });

  it('rejects a non-member actor', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(null);

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
        newRole: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.updateRole).not.toHaveBeenCalled();
  });

  it('rejects a membership that does not belong to the project', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue(
      membership(
        'MEMBER',
        targetMembershipId,
        '22222222-2222-4222-8222-222222222222',
      ),
    );
    membershipRepository.findById.mockImplementationOnce(() =>
      Promise.resolve({ ...membership('MEMBER'), projectId: 'other-project' }),
    );

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
        newRole: 'ADMIN',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents an ADMIN from changing an OWNER role', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('ADMIN'),
    );
    membershipRepository.findById.mockResolvedValue(membership('OWNER'));

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
        newRole: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('prevents demoting the last OWNER', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue(membership('OWNER'));
    membershipRepository.countOwners.mockResolvedValue(1);

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
        newRole: 'MEMBER',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.updateRole).not.toHaveBeenCalled();
  });

  it('allows demoting an OWNER when another OWNER exists', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue(membership('OWNER'));
    membershipRepository.countOwners.mockResolvedValue(2);
    membershipRepository.updateRole.mockResolvedValue(membership('MEMBER'));
    membershipRepository.findMemberById.mockResolvedValue({
      membership: membership('MEMBER'),
      userId: '22222222-2222-4222-8222-222222222222',
      name: 'Ada Lovelace',
      email: 'ada@flowcommerce.local',
    });

    const result = await useCase.execute({
      actorUserId: actorId,
      projectId,
      targetMembershipId,
      newRole: 'MEMBER',
    });

    expect(result.membership.role).toBe('MEMBER');
  });

  it('prevents an ADMIN from granting OWNER', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('ADMIN'),
    );
    membershipRepository.findById.mockResolvedValue(membership('MEMBER'));

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
        newRole: 'OWNER',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.updateRole).not.toHaveBeenCalled();
  });
});
