/**
 * ==========================================================
 * Arquivo: types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar todas as tipagens utilizadas pelo
 * módulo de empresas.
 *
 * ==========================================================
 */

import { CreateCompanyDto } from "./dto/CreateCompany.dto";

export { CreateCompanyDto } from "./dto/CreateCompany.dto";
export type UpdateCompanyDto = Partial<CreateCompanyDto>;
