import type { Lead, LeadId, LeadStage } from '@flowcommerce/types';

// Entidad de dominio de un lead (cliente potencial), siempre atada a su
// proyecto (tenant). El stage es un enum de dominio: la base ya garantiza
// que solo puede contener valores de LeadStage.
export class LeadEntity implements Lead {
  constructor(
    public readonly id: LeadId,
    public readonly projectId: string,
    public readonly name: string,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly stage: LeadStage,
    public readonly score: number,
    public readonly creadoEn: Date,
    public readonly actualizadoEn: Date,
  ) {}

  toLead(): Lead {
    return {
      id: this.id,
      projectId: this.projectId,
      name: this.name,
      email: this.email,
      phone: this.phone,
      stage: this.stage,
      score: this.score,
      creadoEn: this.creadoEn,
      actualizadoEn: this.actualizadoEn,
    };
  }
}
