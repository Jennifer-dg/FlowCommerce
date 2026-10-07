import type { Project } from '@flowcommerce/types';

// Entidad de dominio de un proyecto (el tenant del sistema).
export class ProjectEntity implements Project {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly slug: string,
    public readonly description: string | null,
    public readonly creadoEn: Date,
    public readonly actualizadoEn: Date,
  ) {}

  toProject(): Project {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      description: this.description,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
