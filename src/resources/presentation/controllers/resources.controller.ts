import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Permission } from '@flowcommerce/types';
import { AuthenticatedGuard } from '../../../auth/presentation/guards/authenticated.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user.decorator';
import { RequirePermission } from '../../../authorization/presentation/decorators/require-permission.decorator';
import { ProjectPermissionGuard } from '../../../authorization/presentation/guards/project-permission.guard';
import { CreateResourceUseCase } from '../../application/use-cases/create-resource.use-case';
import { DeleteResourceUseCase } from '../../application/use-cases/delete-resource.use-case';
import { GetResourceUseCase } from '../../application/use-cases/get-resource.use-case';
import { ListResourcesUseCase } from '../../application/use-cases/list-resources.use-case';
import { UpdateResourceUseCase } from '../../application/use-cases/update-resource.use-case';
import { CreateResourceDto } from '../dto/create-resource.dto';
import { ResourceDto } from '../dto/resource.dto';
import { UpdateResourceDto } from '../dto/update-resource.dto';

// CRUD de recursos con ámbito de proyecto; requiere autenticación + permiso
// de recursos según el rol del miembro.
@ApiTags('resources')
@Controller({ path: 'projects/:projectId/resources', version: '1' })
@UseGuards(AuthenticatedGuard, ProjectPermissionGuard)
export class ResourcesController {
  constructor(
    private readonly createResourceUseCase: CreateResourceUseCase,
    private readonly listResourcesUseCase: ListResourcesUseCase,
    private readonly getResourceUseCase: GetResourceUseCase,
    private readonly updateResourceUseCase: UpdateResourceUseCase,
    private readonly deleteResourceUseCase: DeleteResourceUseCase,
  ) {}

  @Get()
  @RequirePermission(Permission.RESOURCE_READ)
  @ApiOkResponse({ type: ResourceDto, isArray: true })
  list(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<ResourceDto[]> {
    return this.listResourcesUseCase
      .execute({ actorUserId: userId, projectId })
      .then((resources) => resources.map((resource) => resource.toResource()));
  }

  @Post()
  @RequirePermission(Permission.RESOURCE_CREATE)
  @ApiCreatedResponse({ type: ResourceDto })
  create(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateResourceDto,
  ): Promise<ResourceDto> {
    return this.createResourceUseCase
      .execute({
        actorUserId: userId,
        projectId,
        name: dto.name,
        description: dto.description ?? null,
      })
      .then((resource) => resource.toResource());
  }

  @Get(':resourceId')
  @RequirePermission(Permission.RESOURCE_READ)
  @ApiOkResponse({ type: ResourceDto })
  get(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<ResourceDto> {
    return this.getResourceUseCase
      .execute({ actorUserId: userId, projectId, resourceId })
      .then((resource) => resource.toResource());
  }

  @Patch(':resourceId')
  @RequirePermission(Permission.RESOURCE_UPDATE)
  @ApiOkResponse({ type: ResourceDto })
  update(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
    @Body() dto: UpdateResourceDto,
  ): Promise<ResourceDto> {
    return this.updateResourceUseCase
      .execute({
        actorUserId: userId,
        projectId,
        resourceId,
        name: dto.name,
        description: dto.description,
      })
      .then((resource) => resource.toResource());
  }

  @Delete(':resourceId')
  @RequirePermission(Permission.RESOURCE_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @CurrentUserId() userId: string,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('resourceId', ParseUUIDPipe) resourceId: string,
  ): Promise<void> {
    return this.deleteResourceUseCase.execute({
      actorUserId: userId,
      projectId,
      resourceId,
    });
  }
}
