/**

* ==========================================================
* Arquivo: PublicBookingEligibility.ts
* ---
* Responsabilidade:
*
* Definir, num único sítio, o que é "um recurso que pertence
* ao tenant e pode receber um agendamento".
*
* ==========================================================
* PORQUÊ ESTE FICHEIRO EXISTE
* ==========================================================
*
* Estas regras já viviam em `AppointmentService` e eram usadas
* pela criação pública, pela alteração pública e pelo fluxo
* administrativo. A Stage 31 Parte 4 precisa delas para o
* catálogo público, e copiá-las teria criado uma segunda
* definição de "serviço ativo" e "profissional ativo" que
* poderia divergir da primeira — o catálogo passava a oferecer
* um serviço que a marcação recusaria, ou a esconder um que
* aceitaria.
*
* Por isso foram EXTRAÍDAS (não reescritas) para aqui. O
* `AppointmentService` passou a delegar e o comportamento é o
* mesmo; os testes existentes continuam a ser a prova.
*
* ==========================================================
* A REGRA CANÓNICA DE VISIBILIDADE
* ==========================================================
*
* • 404 = tenant errado OU recurso eliminado soft.
*   Não confirma a existência do recurso noutra empresa.
* • 400 = recurso do tenant certo, no estado errado
*   (inativo). Só se responde assim a quem já provou que
*   pertence à empresa, o que é inofensivo.
* • 404 = conta `CLIENT`. Uma conta de acesso ao portal não
*   é profissional e a sua existência não é confirmada.
* ==========================================================
 */

import CompanyRepository from "../../companies/repositories/CompanyRepository";
import { CompanyDocument } from "../../companies/models/Company.model";
import ServiceRepository from "../../services/repositories/ServiceRepository";
import { ServiceDocument } from "../../services/models/Service.model";
import UserRepository from "../../users/repositories/UserRepository";
import { UserDocument } from "../../users/models/User.model";

import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { Role } from "../../../constants/roles";

/**
 * Comparação de tenant.
 *
 * O repositório procura por `_id`; o tenant é confirmado DEPOIS,
 * em memória. É o mesmo critério da implementação anterior, e
 * vale para `ObjectId`, `ObjectId` hidratado e simulacros de
 * teste com `toString()`.
 */
function belongsToCompany(
  resource: { companyId: { toString(): string } },
  companyId: string,
): boolean {
  return resource.companyId.toString() === companyId;
}

class PublicBookingEligibility {
  private readonly companyRepository = CompanyRepository;
  private readonly serviceRepository = ServiceRepository;
  private readonly userRepository = UserRepository;

  /**
   * ==========================================================
   * Exige uma empresa existente e ativa.
   *
   * Empresa eliminada devolve 404 porque o repositório já
   * filtra `deletedAt`; empresa inativa devolve 400 porque
   * existe mas não aceita agendamentos.
   * ==========================================================
   */
  public async requireActiveCompany(
    companyId: string,
  ): Promise<CompanyDocument> {
    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError(
        HttpMessages.COMPANY_NOT_FOUND,
        HttpStatus.NOT_FOUND,
      );
    }

    if (!company.isActive) {
      throw new AppError(
        HttpMessages.COMPANY_INACTIVE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return company;
  }

  /**
   * ==========================================================
   * Exige um serviço existente, da empresa e ativo.
   * ==========================================================
   */
  public async requireActiveService(
    serviceId: string,
    companyId: string,
  ): Promise<ServiceDocument> {
    const service = await this.serviceRepository.findById(serviceId);

    if (!service || !belongsToCompany(service, companyId)) {
      throw new AppError(HttpMessages.SERVICE_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!service.isActive) {
      throw new AppError(HttpMessages.SERVICE_INACTIVE, HttpStatus.BAD_REQUEST);
    }

    return service;
  }

  /**
   * ==========================================================
   * Exige um funcionário existente, da empresa e ativo.
   *
   * Não exige `role = EMPLOYEE`: no modelo, `EMPLOYEE` é o valor
   * por omissão e o dono, o gestor e o administrador também
   * atendem.
   *
   * Esta é a MESMA regra que o fluxo administrativo usava, sem
   * qualquer verificação de `role`. É por isso que a conta de
   * acesso é filtrada à parte, em `requireBookableEmployee`.
   * ==========================================================
   */
  public async requireActiveEmployee(
    employeeId: string,
    companyId: string,
  ): Promise<UserDocument> {
    const employee = await this.userRepository.findById(employeeId);

    if (!employee || !belongsToCompany(employee, companyId)) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (!employee.isActive) {
      throw new AppError(
        HttpMessages.EMPLOYEE_INACTIVE,
        HttpStatus.BAD_REQUEST,
      );
    }

    return employee;
  }

  /**
   * ==========================================================
   * Profissional que pode receber um agendamento público.
   *
   * Igual a `requireActiveEmployee`, mais a exclusão da conta
   * de acesso ao portal (`CLIENT`): uma conta de cliente não é
   * profissional e o link público nunca agenda para ela. O 404
   * (e não o 400) evita confirmar a existência da conta.
   *
   * Fica separado de propósito: o fluxo administrativo
   * continua a usar `requireActiveEmployee` e não passa a
   * rejeitar contas `CLIENT`, como antes.
   * ==========================================================
   */
  public async requireBookableEmployee(
    employeeId: string,
    companyId: string,
  ): Promise<UserDocument> {
    const employee = await this.requireActiveEmployee(employeeId, companyId);

    if (employee.role === Role.CLIENT) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return employee;
  }
}

export default new PublicBookingEligibility();