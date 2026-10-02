/**

* ==========================================================
* Arquivo: PublicAppointmentMapper.ts
* ---
* Responsabilidade:
*
* Transformar um agendamento criado pelo fluxo público num
* objeto de resposta para quem fez o pedido.
*
* O contrato público é deliberadamente mais estreito que o
* administrativo: não expõe `clientId`, `companyId`, `notes`
* internos nem timestamps de auditoria.
*
* NOTA: o `id` devolvido é o `_id` interno do MongoDB. Ele serve
* apenas para identificar o agendamento dentro desta resposta.
* NÃO deve ser usado como credencial de acesso público: a etapa
* seguinte criará um identificador próprio para os links de
* consulta/alteração/cancelamento.
* ==========================================================
  */

import { AppointmentDocument } from "../models/Appointment.model";
import { PublicAppointmentResult } from "../index";

class PublicAppointmentMapper {
  /**
   * ==========================================================
   * Constrói a resposta pública.
   *
   * `service` e `employee` são devolvidos pelo serviço a partir
   * dos documentos já validados, para não voltar ao banco.
   * ==========================================================
   */
  public toResponse(
    appointment: AppointmentDocument,
    context: {
      clientName: string;
      service: { id: string; name: string };
      employee: { id: string; name: string };
    },
  ): PublicAppointmentResult {
    return {
      id: appointment._id.toString(),
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      status: appointment.status,
      clientName: context.clientName,
      service: context.service,
      employee: context.employee,
    };
  }
}

export default new PublicAppointmentMapper();