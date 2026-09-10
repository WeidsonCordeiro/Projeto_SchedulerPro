import type { AppointmentStatus } from "../types/appointment";

/**
 * Ações de status suportadas pelos endpoints dedicados do backend
 * (PATCH /appointments/:id/confirm|complete|cancel|no-show).
 */
export type AppointmentStatusAction =
  | "confirm"
  | "complete"
  | "cancel"
  | "no-show";

/**
 * Rótulos PT para exibição, espelhando os valores da enum real do backend
 * (AppointmentStatus: scheduled, confirmed, completed, cancelled, no-show).
 */
export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
  "no-show": "Não compareceu",
};

/**
 * Classes de badge Bootstrap para exibir cada status.
 */
export const APPOINTMENT_STATUS_BADGE_CLASS: Record<AppointmentStatus, string> = {
  scheduled: "text-bg-primary",
  confirmed: "text-bg-info",
  completed: "text-bg-success",
  cancelled: "text-bg-secondary",
  "no-show": "text-bg-warning",
};

export const APPOINTMENT_ACTION_LABELS: Record<AppointmentStatusAction, string> = {
  confirm: "Confirmar",
  complete: "Concluir",
  cancel: "Cancelar",
  "no-show": "Não compareceu",
};

export const APPOINTMENT_ACTION_SUCCESS_MESSAGES: Record<AppointmentStatusAction, string> = {
  confirm: "Agendamento confirmado com sucesso.",
  complete: "Agendamento concluído com sucesso.",
  cancel: "Agendamento cancelado com sucesso.",
  "no-show": "Agendamento marcado como não comparecimento.",
};

/**
 * Transições permitidas pelo backend (AppointmentService.changeStatus):
 * - confirm:  scheduled -> confirmed
 * - complete: confirmed -> completed
 * - cancel:   scheduled | confirmed -> cancelled
 * - no-show:  confirmed -> no-show
 *
 * Qualquer outra transição é rejeitada com 400 STATUS_TRANSITION_NOT_ALLOWED,
 * portanto o frontend só oferece as ações abaixo.
 */
export function getAppointmentStatusActions(
  status: AppointmentStatus,
): AppointmentStatusAction[] {
  switch (status) {
    case "scheduled":
      return ["confirm", "cancel"];
    case "confirmed":
      return ["complete", "cancel", "no-show"];
    case "completed":
    case "cancelled":
    case "no-show":
      return [];
  }
}