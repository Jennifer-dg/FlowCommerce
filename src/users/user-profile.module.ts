import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import {
  GetMyProfileUseCase,
  UpdateMyProfileUseCase,
} from './application/use-cases/profile.use-cases';
import { ProfileController } from './presentation/controllers/profile.controller';
import { UsersModule } from './users.module';

// Módulo aparte de UsersModule: AuthModule ya importa UsersModule, así que el
// controlador (que necesita el guard de AuthModule) no puede vivir en él sin
// crear una dependencia circular.
@Module({
  imports: [AuthModule, UsersModule],
  controllers: [ProfileController],
  providers: [GetMyProfileUseCase, UpdateMyProfileUseCase],
})
export class UserProfileModule {}
