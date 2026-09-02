import type { ResourceEntity } from '../entities/resource.entity';

export interface CreateResourceInput {
  projectId: string;
  name: string;
  description: string | null;
}

export interface UpdateResourceInput {
  name?: string;
  description?: string | null;
}

// Almacén de recursos con ámbito de tenant. Cada lectura/actualización/borrado
// DEBE incluir el `projectId` para que las operaciones nunca crucen la frontera
// del proyecto, aunque el llamador conozca el id global (defensa frente a IDOR/BOLA).
export interface ResourceRepository {
  findByIdInProject(
    id: string,
    projectId: string,
  ): Promise<ResourceEntity | null>;
  listByProject(projectId: string): Promise<ResourceEntity[]>;
  create(input: CreateResourceInput): Promise<ResourceEntity>;
  updateInProject(
    id: string,
    projectId: string,
    input: UpdateResourceInput,
  ): Promise<ResourceEntity | null>;
  deleteInProject(id: string, projectId: string): Promise<boolean>;
}

export const RESOURCE_REPOSITORY = Symbol('RESOURCE_REPOSITORY');
