import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { CreateResourceUseCase } from './application/use-cases/create-resource.use-case';
import { DeleteResourceUseCase } from './application/use-cases/delete-resource.use-case';
import { GetResourceUseCase } from './application/use-cases/get-resource.use-case';
import { ListResourcesUseCase } from './application/use-cases/list-resources.use-case';
import { UpdateResourceUseCase } from './application/use-cases/update-resource.use-case';
import { RESOURCE_REPOSITORY } from './domain/repositories/resource.repository';
import { DrizzleResourceRepository } from './infrastructure/drizzle/drizzle-resource.repository';
import { ResourcesController } from './presentation/controllers/resources.controller';

@Module({
  imports: [AuthModule, AuthorizationModule],
  controllers: [ResourcesController],
  providers: [
    {
      provide: RESOURCE_REPOSITORY,
      useClass: DrizzleResourceRepository,
    },
    CreateResourceUseCase,
    ListResourcesUseCase,
    GetResourceUseCase,
    UpdateResourceUseCase,
    DeleteResourceUseCase,
  ],
  exports: [RESOURCE_REPOSITORY],
})
export class ResourcesModule {}
