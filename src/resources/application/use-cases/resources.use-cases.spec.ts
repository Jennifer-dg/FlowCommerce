import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { AuthorizationService } from '../../../authorization/application/services/authorization.service';
import {
  RESOURCE_REPOSITORY,
  type ResourceRepository,
} from '../../domain/repositories/resource.repository';
import { CreateResourceUseCase } from './create-resource.use-case';
import { DeleteResourceUseCase } from './delete-resource.use-case';
import { GetResourceUseCase } from './get-resource.use-case';
import { ListResourcesUseCase } from './list-resources.use-case';
import { UpdateResourceUseCase } from './update-resource.use-case';

describe('Resources use-cases (tenant isolation)', () => {
  let module: TestingModule;
  const authorizationService = {
    assertCan: jest.fn(),
  };
  const resourceRepository: Record<keyof ResourceRepository, jest.Mock> = {
    findByIdInProject: jest.fn(),
    listByProject: jest.fn(),
    create: jest.fn(),
    updateInProject: jest.fn(),
    deleteInProject: jest.fn(),
  };

  const actorId = '11111111-1111-4111-8111-111111111111';
  const projectId = '33333333-3333-4333-8333-333333333333';
  const resourceId = '55555555-5555-4555-8555-555555555555';
  const foreignResourceId = '66666666-6666-4666-8666-666666666666';
  const now = new Date('2026-01-01T00:00:00.000Z');

  const resource = {
    id: resourceId,
    projectId,
    name: 'Checkout API',
    description: null,
    creadoEn: now,
    actualizadoEn: now,
  };

  beforeAll(async () => {
    module = await Test.createTestingModule({
      providers: [
        CreateResourceUseCase,
        ListResourcesUseCase,
        GetResourceUseCase,
        UpdateResourceUseCase,
        DeleteResourceUseCase,
        {
          provide: AuthorizationService,
          useValue: authorizationService,
        },
        {
          provide: RESOURCE_REPOSITORY,
          useValue: resourceRepository,
        },
      ],
    }).compile();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('create() only creates within the authorized project', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.create.mockResolvedValue(resource);

    const created = await module.get(CreateResourceUseCase).execute({
      actorUserId: actorId,
      projectId,
      name: 'Checkout API',
      description: null,
    });

    expect(created.id).toBe(resourceId);
    expect(resourceRepository.create).toHaveBeenCalledWith({
      projectId,
      name: 'Checkout API',
      description: null,
    });
    expect(authorizationService.assertCan).toHaveBeenCalledWith(
      actorId,
      'RESOURCE_CREATE',
      projectId,
    );
  });

  it('list() returns only resources of the given project', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.listByProject.mockResolvedValue([resource]);

    const result = await module
      .get(ListResourcesUseCase)
      .execute({ actorUserId: actorId, projectId });

    expect(result).toEqual([resource]);
    expect(resourceRepository.listByProject).toHaveBeenCalledWith(projectId);
  });

  it('get() resolves a resource scoped to the project', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.findByIdInProject.mockResolvedValue(resource);

    const result = await module
      .get(GetResourceUseCase)
      .execute({ actorUserId: actorId, projectId, resourceId });

    expect(result.id).toBe(resourceId);
    expect(resourceRepository.findByIdInProject).toHaveBeenCalledWith(
      resourceId,
      projectId,
    );
  });

  it('get() returns 404 for a resource that exists in another project (IDOR)', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.findByIdInProject.mockResolvedValue(null);

    await expect(
      module.get(GetResourceUseCase).execute({
        actorUserId: actorId,
        projectId,
        resourceId: foreignResourceId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(resourceRepository.findByIdInProject).toHaveBeenCalledWith(
      foreignResourceId,
      projectId,
    );
  });

  it('update() scopes the query by (resourceId, projectId)', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.updateInProject.mockResolvedValue({
      ...resource,
      name: 'Renamed',
    });

    const result = await module.get(UpdateResourceUseCase).execute({
      actorUserId: actorId,
      projectId,
      resourceId,
      name: 'Renamed',
    });

    expect(result.name).toBe('Renamed');
    expect(resourceRepository.updateInProject).toHaveBeenCalledWith(
      resourceId,
      projectId,
      { name: 'Renamed', description: undefined },
    );
  });

  it('update() does not touch resources outside the project', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.updateInProject.mockResolvedValue(null);

    await expect(
      module.get(UpdateResourceUseCase).execute({
        actorUserId: actorId,
        projectId,
        resourceId: foreignResourceId,
        name: 'Renamed',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('delete() scopes the query by (resourceId, projectId)', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.deleteInProject.mockResolvedValue(true);

    await module
      .get(DeleteResourceUseCase)
      .execute({ actorUserId: actorId, projectId, resourceId });

    expect(resourceRepository.deleteInProject).toHaveBeenCalledWith(
      resourceId,
      projectId,
    );
  });

  it('delete() does not delete resources outside the project', async () => {
    authorizationService.assertCan.mockResolvedValue(undefined);
    resourceRepository.deleteInProject.mockResolvedValue(false);

    await expect(
      module.get(DeleteResourceUseCase).execute({
        actorUserId: actorId,
        projectId,
        resourceId: foreignResourceId,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
