import type { LeadId, LeadStage } from '@flowcommerce/types';
import type { LeadEntity } from '../entities/lead.entity';

export interface CreateLeadInput {
  projectId: string;
  name: string;
  email: string | null;
  phone: string | null;
  stage: LeadStage;
  score: number;
}

// Filtros del listado. Todos son opcionales y TODOS se combinan con AND sobre
// una condición previa de projectId: el tenant es obligatorio y nunca se
// sustituye por un filtro.
export interface ListLeadsFilter {
  stage?: LeadStage;
  // Búsqueda por texto libre sobre nombre, email y teléfono.
  search?: string;
  page?: number;
  limit?: number;
}

// Campos mutables de un lead. Todos opcionales: el use-case decide si el
// UpdateLeadDto llegó vacío. El projectId NO se puede cambiar: un lead
// pertenece a un tenant y moverlo entre proyectos rompería el aislamiento.
export interface UpdateLeadInput {
  name?: string;
  email?: string | null;
  phone?: string | null;
  stage?: LeadStage;
  score?: number;
}

// Listado paginado: las filas del tenant en la página pedida, más el total de
// filas del tenant para que la capa de presentación pueda calcular las páginas.
export interface PaginatedLeads {
  leads: LeadEntity[];
  total: number;
}

// Almacén de leads con ámbito de tenant. Cada lectura DEBE incluir el
// `projectId` para que las operaciones nunca crucen la frontera del proyecto,
// aunque el llamador conozca el id global (defensa frente a IDOR/BOLA).
// Por eso no existe un `findById(id)` sin proyecto: el ámbito forma parte del
// nombre del método, de modo que la restricción se ve al leer la firma.
export interface LeadRepository {
  findByIdInProject(id: LeadId, projectId: string): Promise<LeadEntity | null>;
  // Localiza un lead por el número en dígitos (sin '+'/espacios) DENTRO del
  // proyecto. El webhook de WhatsApp no trae leadId: hay que casar el `from`
  // con un teléfono del tenant, nunca con un listado global.
  findByPhoneDigitsInProject(
    phoneDigits: string,
    projectId: string,
  ): Promise<LeadEntity | null>;
  listByProject(
    projectId: string,
    filter?: ListLeadsFilter,
  ): Promise<PaginatedLeads>;
  create(input: CreateLeadInput): Promise<LeadEntity>;
  // Devuelve null si el lead no existe EN ESE proyecto. Un lead de otro tenant
  // devuelve null igual que uno inexistente, para que el 404 sea indistinguible.
  updateInProject(
    id: LeadId,
    projectId: string,
    input: UpdateLeadInput,
  ): Promise<LeadEntity | null>;
  // Devuelve false si el lead no existe en ese proyecto. Borra en cascada sus
  // quotes y messages por la FK compuesta con ON DELETE CASCADE.
  deleteInProject(id: LeadId, projectId: string): Promise<boolean>;
}

export const LEADS_REPOSITORY = Symbol('LEADS_REPOSITORY');
