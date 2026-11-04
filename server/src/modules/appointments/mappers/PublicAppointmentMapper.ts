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
 * NÃO é credencial de acesso público: o acesso é feito pelo
 * token opaco devolvido na criação, que não deriva do id e é
 * desconhecido para quem não possui o link.
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
      timezone: string;
      service: { id: string; name: string };
      employee: { id: string; name: string; avatarUrl?: string | null };
    },
  ): PublicAppointmentResult {
    return {
      id: appointment._id.toString(),
      companyId: appointment.companyId.toString(),
      startAt: appointment.startAt,
      endAt: appointment.endAt,
      timezone: context.timezone,
      status: appointment.status,
      clientName: context.clientName,
      service: context.service,
      employee: {
        id: context.employee.id,
        name: context.employee.name,
        avatarUrl: context.employee.avatarUrl ?? null,
      },
    };
  }
}

export default new PublicAppointmentMapper();
