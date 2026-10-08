import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuthorizationModule } from '../authorization/authorization.module';
import { ProjectsModule } from '../projects/projects.module';
import { CreateLeadUseCase } from './application/use-cases/create-lead.use-case';
import { DeleteLeadUseCase } from './application/use-cases/delete-lead.use-case';
import { GetLeadUseCase } from './application/use-cases/get-lead.use-case';
import { ListLeadsUseCase } from './application/use-cases/list-leads.use-case';
import { UpdateLeadUseCase } from './application/use-cases/update-lead.use-case';
import { LEADS_REPOSITORY } from './domain/repositories/lead.repository';
import { DrizzleLeadRepository } from './infrastructure/drizzle/drizzle-lead.repository';
import { LeadsController } from './presentation/controllers/leads.controller';

@Module({
  imports: [AuthModule, AuthorizationModule, ProjectsModule],
  controllers: [LeadsController],
  providers: [
    {
      provide: LEADS_REPOSITORY,
      useClass: DrizzleLeadRepository,
    },
    CreateLeadUseCase,
    ListLeadsUseCase,
    GetLeadUseCase,
    UpdateLeadUseCase,
    DeleteLeadUseCase,
  ],
  exports: [LEADS_REPOSITORY],
})
export class LeadsModule {}
