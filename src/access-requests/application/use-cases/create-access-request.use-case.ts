import { Inject, Injectable, Logger } from '@nestjs/common';
import normalizeEmail from 'normalize-email';
import { NotFoundException } from '../../../common/exceptions/domain.exceptions';
import { isUniqueViolation } from '../../../common/utils/postgres-error';
import { PROJECT_REPOSITORY } from '../../../projects/domain/repositories/project.repository';
import type { ProjectRepository } from '../../../projects/domain/repositories/project.repository';
import { USER_REPOSITORY } from '../../../users/domain/repositories/user.repository';
import type { UserRepository } from '../../../users/domain/repositories/user.repository';
import {
  ACCESS_REQUEST_REPOSITORY,
  type AccessRequestRepository,
} from '../../domain/repositories/access-request.repository';

export interface CreateAccessRequestInput {
  projectId: string;
  email: string;
}

@Injectable()
export class CreateAccessRequestUseCase {
  private readonly logger = new Logger(CreateAccessRequestUseCase.name);

  constructor(
    @Inject(ACCESS_REQUEST_REPOSITORY)
    private readonly accessRequestRepository: AccessRequestRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: ProjectRepository,
  ) {}

  // Endpoint público: pide acceso a un tenant con el correo. Se normaliza el
  // email (normalizeEmail) para que la unicidad sea estable.
  //
  // Anti-enumeración: el resultado es SIEMPRE el mismo (void -> 202) exista o
  // no una cuenta con ese correo y haya o no una solicitud pendiente. Antes un
  // 409 permitía descubrir qué correos tienen cuenta. Solo el proyecto
  // inexistente responde 404: su id es un UUID imposible de adivinar.
  async execute(input: CreateAccessRequestInput): Promise<void> {
    const email = normalizeEmail(input.email.trim());

    // El 404 evita crear solicitudes para tenants inexistentes.
    const project = await this.projectRepository.findById(input.projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (await this.userRepository.existsByEmail(email)) {
      this.logger.log(
        'Access request ignored: the email already has an account',
      );
      return;
    }

    const pending =
      await this.accessRequestRepository.findPendingByProjectAndEmail(
        input.projectId,
        email,
      );
    if (pending) {
      this.logger.log('Access request ignored: one is already pending');
      return;
    }

    try {
      await this.accessRequestRepository.create({
        projectId: input.projectId,
        email,
      });
    } catch (error) {
      // Dos solicitudes simultáneas: la segunda choca con la unicidad y se
      // trata igual que un duplicado, sin revelarlo.
      if (!isUniqueViolation(error)) {
        throw error;
      }
    }
  }
}
