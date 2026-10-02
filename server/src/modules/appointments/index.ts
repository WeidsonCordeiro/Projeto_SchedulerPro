/**

* ==========================================================
* Arquivo: index.ts
* ---
* Responsabilidade:
*
* Centralizar as tipagens internas utilizadas pelo módulo
* de agendamentos.
*
* Os DTOs representam os dados recebidos nas operações da API.
*
* As tipagens deste arquivo representam dados internos,
* incluindo campos controlados pelo backend.
*
* ==========================================================
  */

import { Types } from "mongoose";
import { AppointmentStatus } from "../../constants/appointment-status";

/**

* ==========================================================
* Dados necessários para criar um agendamento.
*
* companyId e endAt são definidos internamente pelo backend.
* ==========================================================
  */
export interface CreateAppointmentData {
  companyId: Types.ObjectId;
  clientId: Types.ObjectId;
  serviceId: Types.ObjectId;
  employeeId: Types.ObjectId;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  notes?: string | null;
}

/**

* ==========================================================
* Dados permitidos para atualização interna
* de um agendamento.
*
* endAt poderá ser recalculado pelo backend.
* ==========================================================
  */
export interface UpdateAppointmentData {
  clientId?: Types.ObjectId;
  serviceId?: Types.ObjectId;
  employeeId?: Types.ObjectId;
  startAt?: Date;
  endAt?: Date;
  notes?: string | null;
}

/**

* ==========================================================
* Contrato de resposta do agendamento público.
*
* Mais estreito que `AppointmentMapper.toResponse`: não expõe
* `companyId`, `clientId`, `notes` nem timestamps de auditoria.
*
* O `id` é o `_id` interno e serve apenas para identificar o
* agendamento dentro da resposta. Não é credencial de acesso
* público.
* ==========================================================
  */
export interface PublicAppointmentResult {
  id: string;
  startAt: Date;
  endAt: Date;
  status: AppointmentStatus;
  clientName: string;
  service: {
    id: string;
    name: string;
  };
  employee: {
    id: string;
    name: string;
  };
}
