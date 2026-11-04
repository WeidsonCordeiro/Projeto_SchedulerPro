import { getFriendlyErrorMessage } from "../api/errors";
import type { ApiFailure } from "../api/errors";
import type { StoredImage } from "../types/image";
import type { PublicAppointment } from "../types/publicAppointment";
import { formatAppointmentTime } from "./appointmentTime";

/**
 * Regras de apresentação e de erro da página pública do agendamento.
 *
 * Concentra tudo o que é decisão de produto (limites, textos, elegibilidade)
 * para que a página e os seus componentes fiquem apenas com markup e estado.
 */

/** Máximo aceito pelo backend (`update-public-appointment.validator.ts`). */
export const PUBLIC_APPOINTMENT_MAX_NOTES_LENGTH = 500;

/**
 * Mensagem de link inválido.
 *
 * O backend devolve exatamente o mesmo 404 para token malformado, token
 * inexistente e agendamento eliminado: o frontend não tenta (e não pode)
 * distinguir os três casos.
 */
export const PUBLIC_APPOINTMENT_NOT_FOUND_MESSAGE =
  "Agendamento não encontrado.";

/**
 * Descrição mostrada quando o link não resolve. Explica o motivo sem sugerir
 * que a origem é a tentativa (que é exactamente o que o 404 único esconde).
 */
export const PUBLIC_APPOINTMENT_NOT_FOUND_DESCRIPTION =
  "O link pode estar errado ou ter expirado. Confirme o endereço com a empresa que marcou o agendamento.";

/** Espelha `HttpMessages.PUBLIC_APPOINTMENT_NOT_EDITABLE`. */
export const PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE =
  "Este agendamento já não pode ser alterado nem cancelado.";

/**
 * 429: o limitador é por IP e partilhado por todos os pedidos do link, por
 * isso a mensagem fala em tentativas e não em agendamento — é a unidade que o
 * utilizador consegue corrigir, esperando.
 */
export const PUBLIC_APPOINTMENT_RATE_LIMIT_MESSAGE =
  "Demasiadas tentativas. Aguarde alguns minutos antes de tentar novamente.";

/** Mensagem para `/agendar` sem token na rota. */
export const PUBLIC_APPOINTMENT_INVALID_LINK_MESSAGE =
  "Link de agendamento inválido.";

/** Mensagens de sucesso das duas escritas. */
export const PUBLIC_APPOINTMENT_SUCCESS_MESSAGES = {
  updated: "Agendamento alterado com sucesso.",
  cancelled: "Agendamento cancelado.",
} as const;

/**
 * Estados de falha da consulta inicial.
 *
 * A página precisa de distinguir apenas três caminhos com ações diferentes:
 * link inválido (sem retry), limite atingido (aguardar) e erro transitório
 * (tentar novamente).
 */
export type PublicAppointmentLoadFailure =
  | "not_found"
  | "rate_limited"
  | "error";

/**
 * Traduz uma falha HTTP da consulta inicial para um estado de ecrã.
 *
 * `429` não é mapeado por `getApiError` para uma `kind` própria (cai em
 * "unknown"), por isso é verificado pelo status: é o caso que exige uma
 * mensagem diferente e nenhum retry imediato.
 */
export function getPublicAppointmentLoadFailure(
  failure: ApiFailure,
): PublicAppointmentLoadFailure {
  if (failure.status === 404) {
    return "not_found";
  }
  if (failure.status === 429) {
    return "rate_limited";
  }
  return "error";
}

/**
 * Mensagem a mostrar para uma falha de escrita (PATCH/DELETE).
 *
 * O `400` é a regra de negócio do servidor (horário indisponível,
 * profissional indisponível, agendamento não alterável) e a mensagem do
 * backend já é escrita para o utilizador final, por isso é preservada. O
 * resto cai nas mensagens amigáveis partilhadas, sem duplicar texto técnico.
 */
export function getPublicAppointmentWriteMessage(
  failure: ApiFailure,
): string {
  if (failure.status === 429) {
    return PUBLIC_APPOINTMENT_RATE_LIMIT_MESSAGE;
  }
  if (failure.kind === "not_found") {
    return PUBLIC_APPOINTMENT_NOT_FOUND_MESSAGE;
  }
  return getFriendlyErrorMessage(failure);
}

/**
 * Detecta o "já não é alterável" devolvido com 400.
 *
 * O `AppError` público não transporta `code`, portanto a única forma de o
 * reconhecer é comparar com a mensagem única do backend
 * (`HttpMessages.PUBLIC_APPOINTMENT_NOT_EDITABLE`). Serve para bloquear o
 * formulário depois de uma recusa, sem confiar só no estado local.
 */
export function isPublicAppointmentNotEditableFailure(
  failure: ApiFailure,
): boolean {
  return (
    failure.kind === "validation" &&
    failure.message.trim() === PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE
  );
}

/**
 * Elegibilidade calculada no cliente.
 *
 * Reproduz a regra do backend (`assertPublicAppointmentIsEditable`): só
 * `scheduled`/`confirmed` ainda por acontecer podem ser alterados ou
 * cancelados.
 *
 * É apenas uma dica de interface — o botão some mais cedo — e nunca uma
 * autorização: o servidor continua a ser a autoridade, e uma recusa sua
 * bloqueia o formulário de qualquer maneira.
 */
export function isPublicAppointmentEditable(
  appointment: PublicAppointment,
  nowMs: number = Date.now(),
): boolean {
  if (
    appointment.status !== "scheduled" &&
    appointment.status !== "confirmed"
  ) {
    return false;
  }
  const startAt = new Date(appointment.startAt).getTime();
  return Number.isFinite(startAt) && startAt > nowMs;
}

/**
 * "15:30 – 16:00", no fuso da empresa.
 *
 * Reutiliza `formatAppointmentTime`, que aplica o mesmo fuso do resto da
 * aplicação (ver `APPOINTMENT_TIMEZONE`).
 */
export function getPublicAppointmentPeriod(
  appointment: PublicAppointment,
): string {
  const start = formatAppointmentTime(appointment.startAt, appointment.timezone);
  const end = formatAppointmentTime(appointment.endAt, appointment.timezone);
  if (!start || !end) {
    return start || end;
  }
  return `${start} – ${end}`;
}

/**
 * Adapta o `avatarUrl` do contrato público para o input de `ImageAvatar`.
 *
 * A resposta pública só transporta a URL: o `publicId` do storage nunca sai
 * do backend num pedido público. Como `ImageAvatar` só lê `url`, o adaptador
 * preenche `publicId` com uma string vazia em vez de inventar um
 * identificador. URL vazia ou ausente dá `null` e o componente mostra as
 * iniciais.
 */
export function toPublicAvatarImage(
  avatarUrl: string | null | undefined,
): StoredImage | null {
  const url = avatarUrl?.trim();
  return url ? { url, publicId: "" } : null;
}
