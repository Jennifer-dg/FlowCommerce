import type { Resource, ResourceId } from '@flowcommerce/types';

// Entidad de dominio de un recurso, siempre atado a su proyecto (tenant).
export class ResourceEntity implements Resource {
  constructor(
    public readonly id: ResourceId,
    public readonly projectId: string,
    public readonly name: string,
    public readonly description: string | null,
    public readonly creadoEn: Date,
    public readonly actualizadoEn: Date,
  ) {}

  toResource(): Resource {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      description: this.description,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
