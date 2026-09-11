/**
 * Espelha o contrato real de Company do backend
 * (server/src/modules/companies).
 *
 * A resposta (CompanyMapper.toResponse) devolve exatamente:
 *   id, name, timezone, isActive, createdAt, updatedAt.
 *
 * O nome é armazenado em minúsculas pelo schema (trim + lowercase).
 * deletedAt nunca é devolvido pelo backend e não existe nesta resposta.
 * companyId não é um campo separado: o id do recurso É o id da empresa.
 */
export interface Company {
  id: string;
  name: string;
  timezone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Campos realmente editáveis via PATCH /companies/:id
 * (UpdateCompany.dto.ts do backend): apenas name e timezone.
 *
 * companyId, id, isActive, deletedAt, createdAt e updatedAt NÃO podem
 * ser enviados pelo frontend (o backend os ignora/deriva da sessão).
 */
export interface UpdateCompanyPayload {
  name?: string;
  timezone?: string;
}