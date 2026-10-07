import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { UsersModule } from '../users/users.module';
import { AddMemberUseCase } from './application/use-cases/add-member.use-case';
import { ChangeMemberRoleUseCase } from './application/use-cases/change-member-role.use-case';
import { CreateProjectUseCase } from './application/use-cases/create-project.use-case';
import { ListMyProjectsUseCase } from './application/use-cases/list-my-projects.use-case';
import { ListProjectMembersUseCase } from './application/use-cases/list-project-members.use-case';
import { RemoveMemberUseCase } from './application/use-cases/remove-member.use-case';
import { PROJECT_REPOSITORY } from './domain/repositories/project.repository';
import { MEMBERSHIP_REPOSITORY } from './domain/repositories/membership.repository';
import { DrizzleMembershipRepository } from './infrastructure/drizzle/drizzle-membership.repository';
import { DrizzleProjectRepository } from './infrastructure/drizzle/drizzle-project.repository';
import { ProjectsController } from './presentation/controllers/projects.controller';

@Module({
  imports: [UsersModule, AuthModule, forwardRef(() => AuthorizationModule)],
  controllers: [ProjectsController],
  providers: [
    {
      provide: PROJECT_REPOSITORY,
      useClass: DrizzleProjectRepository,
    },
    {
      provide: MEMBERSHIP_REPOSITORY,
      useClass: DrizzleMembershipRepository,
    },
    CreateProjectUseCase,
    ListMyProjectsUseCase,
    ListProjectMembersUseCase,
    AddMemberUseCase,
    ChangeMemberRoleUseCase,
    RemoveMemberUseCase,
  ],
  exports: [PROJECT_REPOSITORY, MEMBERSHIP_REPOSITORY],
})
export class ProjectsModule {}
