/**
 * ==========================================================
 * Arquivo: Register.dto.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Representar os dados necessários para cadastrar
 * um novo usuário no sistema.
 *
 * Este DTO é utilizado para:
 *
 * • Validação da requisição
 * • Padronização dos dados recebidos
 * • Comunicação entre Controller e Service
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { CreateCompanyDto } from "../../companies/dto/CreateCompany.dto";

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  company: CreateCompanyDto;
}
