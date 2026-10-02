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
*
* `publicAccessTokenHash` NÃO entra aqui: a alteração de um
* agendamento (administrativa ou pública) nunca regenera nem
* apaga o token, para que o link já entregue continue válido.
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
* agendamento dentro da resposta. NÃO é credencial de acesso
* público: o acesso é feito pelo token, que é opaco e não
* deriva do id.
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
    /**
     * Foto do profissional, ou `null`.
     *
     * Mantém a experiência pública consistente com o seletor de
     * profissional da Stage 30. Exposta apenas como `url`: o
     * `publicId` do storage nunca sai do backend.
     */
    avatarUrl: string | null;
  };
}

/**

* ==========================================================
* Resposta da criação pública.
*
* O token puro é devolvido UMA vez, aqui, no pedido que o
* cria. Não é recuperável depois: a base de dados guarda
* apenas o hash.
* ==========================================================
  */
export interface CreatePublicAppointmentResult {
  appointment: PublicAppointmentResult;
  publicAccessToken: string;
}
