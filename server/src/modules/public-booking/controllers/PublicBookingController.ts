/**

* ==========================================================
* Arquivo: PublicBookingController.ts
* ---
* Responsabilidade:
*
* Atender aos pedidos PÚBLICOS de catálogo e disponibilidade
* (sem autenticação) e delegar as regras a
* `PublicBookingService`.
*
* O `companyId` vem EXCLUSIVAMENTE de `:companyId` na URL.
* Nunca é lido do corpo nem da query, que é o que impede um
* pedido anónimo consultar a agenda de outra empresa.
*
* A camada HTTP é intencionalmente fina: lê o tenant da rota,
* passa os parâmetros ao serviço e devolve o contrato público.
* ==========================================================
 */

import { Request, Response } from "express";

import PublicBookingService from "../services/PublicBookingService";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { ResponseHandler } from "../../../utils/response";

class PublicBookingController {
  /**
   * ==========================================================
   * `GET /api/public/companies/:companyId/services`
   *
   * Serviços ativos que a empresa disponibiliza.
   * ==========================================================
   */
  public listServices = async (req: Request, res: Response) => {
    const services = await PublicBookingService.listPublicServices(
      req.params.companyId as string,
    );

    return ResponseHandler.success(
      res,
      services,
      HttpMessages.PUBLIC_SERVICES_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * `GET /api/public/companies/:companyId/employees`
   *
   * Profissionais ativos, excluindo contas de acesso.
   * ==========================================================
   */
  public listEmployees = async (req: Request, res: Response) => {
    const employees = await PublicBookingService.listPublicEmployees(
      req.params.companyId as string,
    );

    return ResponseHandler.success(
      res,
      employees,
      HttpMessages.PUBLIC_EMPLOYEES_FOUND,
      HttpStatus.OK,
    );
  };

  /**
   * ==========================================================
   * `GET /api/public/companies/:companyId/availability`
   *
   * Horários livres para um serviço, um profissional e uma data.
   *
   * O `companyId` nunca é lido de `req.query`: o tenant é o da
   * rota. Só os três parâmetros do DTO chegam daqui.
   * ==========================================================
   */
  public getAvailability = async (req: Request, res: Response) => {
    const availability = await PublicBookingService.getPublicAvailability(
      req.params.companyId as string,
      {
        serviceId: req.query.serviceId as string,
        employeeId: req.query.employeeId as string,
        date: req.query.date as string,
      },
    );

    return ResponseHandler.success(
      res,
      availability,
      HttpMessages.PUBLIC_AVAILABILITY_FOUND,
      HttpStatus.OK,
    );
  };
}

export default new PublicBookingController();