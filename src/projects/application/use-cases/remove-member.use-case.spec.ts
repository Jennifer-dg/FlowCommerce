import { Test, TestingModule } from '@nestjs/testing';
import {
  ForbiddenException,
  NotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { MEMBERSHIP_REPOSITORY } from '../../domain/repositories/membership.repository';
import { RemoveMemberUseCase } from './remove-member.use-case';

describe('RemoveMemberUseCase', () => {
  let useCase: RemoveMemberUseCase;
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
        RemoveMemberUseCase,
        {
          provide: MEMBERSHIP_REPOSITORY,
          useValue: membershipRepository,
        },
      ],
    }).compile();

    useCase = module.get(RemoveMemberUseCase);
    jest.clearAllMocks();
  });

  const now = new Date('2026-01-01T00:00:00.000Z');
  const actorId = '11111111-1111-4111-8111-111111111111';
  const projectId = '33333333-3333-4333-8333-333333333333';
  const targetMembershipId = '44444444-4444-4444-8444-444444444444';

  const membership = (role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => ({
    id: targetMembershipId,
    userId: '22222222-2222-4222-8222-222222222222',
    projectId,
    role,
    creadoEn: now,
    actualizadoEn: now,
  });

  const baseActor = (role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER') => ({
    id: 'actor-membership',
    userId: actorId,
    projectId,
    role,
    creadoEn: now,
    actualizadoEn: now,
  });

  it('lets an OWNER remove a MEMBER', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue(membership('MEMBER'));

    await useCase.execute({
      actorUserId: actorId,
      projectId,
      targetMembershipId,
    });

    expect(membershipRepository.delete).toHaveBeenCalledWith(
      targetMembershipId,
    );
  });

  it('rejects a non-member actor', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(null);

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.delete).not.toHaveBeenCalled();
  });

  it('rejects removing a membership from another project', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue({
      ...membership('MEMBER'),
      projectId: 'other-project',
    });

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('prevents an ADMIN from removing an OWNER', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('ADMIN'),
    );
    membershipRepository.findById.mockResolvedValue(membership('OWNER'));

    await expect(
      useCase.execute({
        actorUserId: actorId,
        projectId,
        targetMembershipId,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.delete).not.toHaveBeenCalled();
  });

  it('prevents removing the last OWNER', async () => {
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
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(membershipRepository.delete).not.toHaveBeenCalled();
  });

  it('allows removing an OWNER when another OWNER exists', async () => {
    membershipRepository.findByUserAndProject.mockResolvedValue(
      baseActor('OWNER'),
    );
    membershipRepository.findById.mockResolvedValue(membership('OWNER'));
    membershipRepository.countOwners.mockResolvedValue(2);

    await useCase.execute({
      actorUserId: actorId,
      projectId,
      targetMembershipId,
    });

    expect(membershipRepository.delete).toHaveBeenCalledWith(
      targetMembershipId,
    );
  });
});
