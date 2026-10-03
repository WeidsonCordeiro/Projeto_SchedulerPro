import { DateTime } from "luxon";
import { getFriendlyErrorMessage } from "../api/errors";
import type { ApiFailure } from "../api/errors";
import type { StoredImage } from "../types/image";
import type {
  CreatePublicAppointmentPayload,
  PublicAvailabilitySlot,
} from "../types/publicBooking";

/**
 * Regras de apresentação e validação do fluxo público de NOVO agendamento.
 *
 * Os limites abaixo NÃO são uma decisão do frontend: são uma cópia de
 * `server/src/modules/appointments/validators/create-public-appointment.validator.ts`
 * para dar o erro no campo certo, à primeira tentativa. O servidor continua a
 * ser a autoridade — revalida tudo, porque um endpoint público não pode
 * confiar num formulário.
 *
 * A verificação no cliente é UX, não segurança: quem crafts pedidos à mão não
 * passa por aqui.
 */

/** `clientName`: `isLength({ min: 2, max: 100 })` depois de `trim()`. */
export const BOOKING_NAME_MIN_LENGTH = 2;
export const BOOKING_NAME_MAX_LENGTH = 100;

/** `clientEmail`: `isEmail()` + `isLength({ max: 254 })`. */
export const BOOKING_EMAIL_MAX_LENGTH = 254;

/** `clientPhone`: `isLength({ min: 8, max: 20 })`; opcional. */
export const BOOKING_PHONE_MIN_LENGTH = 8;
export const BOOKING_PHONE_MAX_LENGTH = 20;

/** `notes`: `isLength({ max: 500 })`; opcional. */
export const BOOKING_NOTES_MAX_LENGTH = 500;

/**
 * Formato de `date` na query da disponibilidade.
 *
 * "AAAA-MM-DD" e não um instante: o backend compara com períodos locais
 * ("HH:mm") da empresa. Enviar `2026-10-08T00:00:00Z` mudaria o dia consoante
 * o fuso, e o cliente deixaria de ver os horários que espera.
 */
export const BOOKING_DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validação de email deliberadamente mais simples do que a do `validator.js`.
 *
 * Não tenta replicar `isEmail()` — que é uma lista longa de casos de canto —
 * mas rejeita o que está claramente errado e deixa o servidor decidir o resto.
 * Um email válido segundo esta expressão pode ainda ser recusado com 400; um
 * email inválido nunca passa.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ------------------------------------------------------------------ */
/* Estados vazios                                                      */
/* ------------------------------------------------------------------ */

/**
 * Respostas 200 com `data: []` são um resultado legítimo, não uma falha: a
 * empresa existe e não tem (ainda) serviços/profissionais, ou o dia escolhido
 * já não tem vagas. Um ecrã de erro aqui seria mentira.
 */
export const BOOKING_NO_SERVICES_MESSAGE =
  "No momento não existem serviços disponíveis para agendamento.";
export const BOOKING_NO_EMPLOYEES_MESSAGE =
  "No momento não existem profissionais disponíveis.";
export const BOOKING_NO_SLOTS_MESSAGE =
  "Não existem horários disponíveis para esta data. Escolha outra data.";

/* ------------------------------------------------------------------ */
/* Mensagens de falha                                                  */
/* ------------------------------------------------------------------ */

/**
 * 409 — o horário foi ocupado entre a leitura da disponibilidade e o envio.
 *
 * Este é o único conflito "esperado" do fluxo e é tratado à parte: a
 * disponibilidade é recarregada e o utilizador escolhe outro horário, com o
 * resto do formulário intacto. Repetir o pedido às cegas seria pedir o mesmo
 * 409 outra vez.
 */
export const BOOKING_SLOT_TAKEN_MESSAGE =
  "Esse horário acabou de ser ocupado. Escolha outro horário disponível.";

/**
 * 429 — o limitador é por IP e partilhado entre as quatro rotas. "Demasiadas
 * tentativas" e não "demasiados agendamentos": a unidade que o utilizador
 * controla, esperando, é a tentativa.
 */
export const BOOKING_RATE_LIMIT_MESSAGE =
  "Demasiadas tentativas. Aguarde alguns minutos antes de tentar novamente.";

/**
 * 404 — empresa inexistente/inativa, ou catálogo sem a empresa.
 *
 * O backend devolve o mesmo 404 para "não existe" e "não pode ser agendada",
 * e o `companyId` vem de uma URL que o utilizador pode ter escrito à mão: não
 * vale a pena sugerir que o link é que está errado.
 */
export const BOOKING_COMPANY_NOT_FOUND_MESSAGE =
  "Não foi possível encontrar os dados de agendamento desta empresa.";

/**
 * 500 — o agendamento não foi criado.
 *
 * O que interessa aqui é o que o utilizador precisa de saber: se ficou marcado
 * ou não. E a resposta honesta é que não se sabe, daí o "tente novamente" em
 * vez de uma promessa de que o horário ainda lá está.
 */
export const BOOKING_SERVER_ERROR_MESSAGE =
  "Não foi possível concluir o agendamento. Tente novamente dentro de momentos.";

/**
 * 400 — regra de negócio (horário já no passado, indisponível, limite de
 * antecedência...). A mensagem do backend já é escrita para o utilizador
 * final, por isso é preservada em vez de substituída.
 */

/** Caminhos de falha com ações diferentes no ecrã. */
export type BookingFailureKind =
  | "not_found"
  | "rate_limited"
  | "conflict"
  | "validation"
  | "network"
  | "server";

/**
 * Traduz uma falha HTTP para o tipo de reação do ecrã.
 *
 * `429` é verificado pelo `status` porque `getApiError` não lhe dá `kind`
 * própria: cai em "unknown", e é precisamente o caso que precisa de uma
 * mensagem diferente e de nenhum retry imediato.
 */
export function getBookingFailureKind(failure: ApiFailure): BookingFailureKind {
  if (failure.status === 429) {
    return "rate_limited";
  }
  if (failure.status === 409) {
    return "conflict";
  }
  if (failure.kind === "not_found") {
    return "not_found";
  }
  if (failure.kind === "validation") {
    return "validation";
  }
  if (failure.kind === "network") {
    return "network";
  }
  return "server";
}

/**
 * Mensagem final para mostrar ao utilizador.
 *
 * Cada falha tem ACÇÃO diferente, logo mensagem diferente: 409 recarrega a
 * disponibilidade, 429 manda esperar, 404 manda confirmar o link, 400 explica
 * o campo. Só o 400 e o 500 passam pelo texto do backend — no 400 porque a
 * regra é do servidor e o texto já é seu; nos restantes a mensagem precisa de
 * existir do lado do cliente, porque um 500 do backend em HTML não ajuda.
 */
export function getBookingErrorMessage(failure: ApiFailure): string {
  switch (getBookingFailureKind(failure)) {
    case "conflict":
      return BOOKING_SLOT_TAKEN_MESSAGE;
    case "rate_limited":
      return BOOKING_RATE_LIMIT_MESSAGE;
    case "not_found":
      return BOOKING_COMPANY_NOT_FOUND_MESSAGE;
    case "server":
      return BOOKING_SERVER_ERROR_MESSAGE;
    default:
      // "validation" e "network": texto do backend (quando é um 400 de regra
      // de negócio) e, para a rede, "não foi possível ligar ao servidor".
      return getFriendlyErrorMessage(failure);
  }
}

/* ------------------------------------------------------------------ */
/* Datas, horários e durações                                         */
/* ------------------------------------------------------------------ */

/**
 * Preço do serviço, no formato usado no resto da aplicação
 * (`ServicesPage.formatPrice`): pt-PT com duas casas.
 */
export function formatBookingPrice(price: number): string {
  return price.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Duração do serviço em linguagem corrente: "45 min", "1 h", "1 h 30 min".
 *
 * Arredonda-se porque `durationMinutes` é um inteiro de minutos e não há
 * porquê mostrar decimais a quem está a escolher.
 */
export function formatBookingDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return "";
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} h`);
  }
  if (rest > 0) {
    parts.push(`${rest} min`);
  }
  return parts.join(" ");
}

/**
 * Fuso a usar na apresentação, ou o deslocamento que o próprio instante carrega.
 *
 * A resposta de disponibilidade traz sempre `timezone`, por isso o primeiro
 * ramo é o normal. O segundo existe para o caso defensivo de um slot chegar
 * sem fuso conhecido: usar o offset embutido no `startAt` mostra a hora de
 * parede que o servidor calculou, ao passo que assumir UTC mostraria a hora de
 * Greenwich — um número plausível e errado, que é o pior tipo de erro numa
 * marcação.
 *
 * `locale: "pt"` é obrigatório e não decorativo: sem ele o Luxon usa o locale
 * do browser, e numa máquina em inglês a confirmação diria "Thursday, 8 de
 * October de 2026". Mesmo padrão de `formatWeekdayDate` em `appointmentTime.ts`.
 */
function parseInCompanyZone(iso: string, timezone?: string | null) {
  return timezone && timezone.length > 0
    ? DateTime.fromISO(iso, { zone: timezone, locale: "pt" })
    : DateTime.fromISO(iso, { locale: "pt" });
}

/**
 * Hora de início de um horário livre no timezone da empresa: "HH:mm".
 *
 * O `timezone` é o que a resposta de disponibilidade devolveu — nunca uma
 * constante do frontend. Um `startAt` já vem com deslocamento, mas mostrar o
 * valor sem converter para o fuso da empresa mostraria a hora de Greenwich a
 * quem marcou às 09:00.
 *
 * Retorna "" para datas inválidas, para não imprimir "Invalid DateTime".
 */
export function formatSlotTime(
  startAt: string,
  timezone?: string | null,
): string {
  const datetime = parseInCompanyZone(startAt, timezone);
  return datetime.isValid ? datetime.toFormat("HH:mm") : "";
}

/**
 * Dia completo do horário escolhido: "quinta-feira, 8 de outubro de 2026".
 *
 * Usa o mesmo timezone da resposta de disponibilidade, pelo mesmo motivo de
 * `formatSlotTime`: a confirmação tem de repetir a hora que o utilizador viu.
 */
export function formatBookingDate(
  startAt: string,
  timezone?: string | null,
): string {
  const datetime = parseInCompanyZone(startAt, timezone);
  if (!datetime.isValid) {
    return "";
  }
  const weekday = datetime
    .toFormat("cccc")
    .replace(/^./, (char) => char.toLocaleUpperCase("pt"));
  return `${weekday}, ${datetime.toFormat("d 'de' MMMM 'de' yyyy")}`;
}

/**
 * Rótulo curto da data escolhida, "AAAA-MM-DD" → "08/10/2026".
 *
 * Conversão PURAMENTE de calendário: a chave já é o dia no fuso da empresa, por
 * isso passa pelos componentes sem tocar em timezone. Reatribuir-lhe um
 * instante — e reconverter — deslocaria o dia quando a empresa está atrás de
 * Greenwich.
 */
export function formatDateKey(dateKey: string): string {
  if (!BOOKING_DATE_KEY_PATTERN.test(dateKey)) {
    return "";
  }
  const parsed = DateTime.fromFormat(dateKey, "yyyy-MM-dd");
  return parsed.isValid ? parsed.toFormat("dd/MM/yyyy") : "";
}

/**
 * Chave "AAAA-MM-DD" do dia de hoje no `timezone` indicado.
 *
 * Usada como `min` do campo de data: o backend recusa o passado, mas mostrar
 * no calendário dias que já passaram é oferecer ao utilizador uma escolha
 * garantidamente inválida.
 *
 * Sem `timezone`, assume a zona do browser. É o melhor disponível antes da
 * primeira resposta de disponibilidade — que é a única fonte de `company.timezone`
 * neste fluxo, já que os endpoints de catálogo não a trazem. Assim que essa
 * resposta chega, a página passa a chamar esta função com o fuso da empresa e
 * o limite é corrigido.
 */
export function getTodayDateKey(timezone?: string): string {
  const today = timezone
    ? DateTime.now().setZone(timezone)
    : DateTime.local();
  return today.isValid ? (today.toISODate() as string) : "";
}

/** Verifica se a data está no formato que a query da disponibilidade exige. */
export function isValidDateKey(dateKey: string): boolean {
  return BOOKING_DATE_KEY_PATTERN.test(dateKey) &&
    DateTime.fromFormat(dateKey, "yyyy-MM-dd").isValid;
}

/* ------------------------------------------------------------------ */
/* Validação dos dados do cliente                                      */
/* ------------------------------------------------------------------ */

/** Dados recolhidos no formulário, já sem espaços nas pontas. */
export interface ClientDetailsInput {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  notes: string;
}

export type ClientDetailsField =
  | "clientName"
  | "clientEmail"
  | "clientPhone"
  | "notes";

export type ClientDetailsErrors = Partial<Record<ClientDetailsField, string>>;

/**
 * Replica as regras do validator para `clientName`/`clientEmail`/
 * `clientPhone`/`notes`.
 *
 * A ordem das regras é a do backend: primeiro o obrigatório, depois o formato,
 * depois o tamanho. Mostra o mesmo erro que o servidor mostraria, no mesmo
 * campo — em vez de "algo correu mal" por causa de um espaço no fim.
 */
export function validateClientDetails(
  details: ClientDetailsInput,
): ClientDetailsErrors {
  const errors: ClientDetailsErrors = {};
  const name = details.clientName.trim();
  const email = details.clientEmail.trim();
  const phone = details.clientPhone.trim();
  const notes = details.notes.trim();

  if (name.length === 0) {
    errors.clientName = "O nome é obrigatório.";
  } else if (name.length < BOOKING_NAME_MIN_LENGTH) {
    errors.clientName = "O nome deve ter pelo menos 2 caracteres.";
  } else if (name.length > BOOKING_NAME_MAX_LENGTH) {
    errors.clientName = `O nome deve ter no máximo ${BOOKING_NAME_MAX_LENGTH} caracteres.`;
  }

  if (email.length === 0) {
    errors.clientEmail = "O e-mail é obrigatório.";
  } else if (
    email.length > BOOKING_EMAIL_MAX_LENGTH ||
    !EMAIL_PATTERN.test(email)
  ) {
    errors.clientEmail = "O e-mail informado é inválido.";
  }

  // O telefone é opcional, mas se vier tem de ser um telefone: o backend
  // aceita entre 8 e 20 caracteres sem impor formato, para não chocar com
  // números internacionais.
  if (phone.length > 0 && (
    phone.length < BOOKING_PHONE_MIN_LENGTH ||
    phone.length > BOOKING_PHONE_MAX_LENGTH
  )) {
    errors.clientPhone = `O telefone deve ter entre ${BOOKING_PHONE_MIN_LENGTH} e ${BOOKING_PHONE_MAX_LENGTH} caracteres.`;
  }

  if (notes.length > BOOKING_NOTES_MAX_LENGTH) {
    errors.notes = `As observações devem ter no máximo ${BOOKING_NOTES_MAX_LENGTH} caracteres.`;
  }

  return errors;
}

/** `true` quando não há nenhum erro por corrigir. */
export function isClientDetailsValid(errors: ClientDetailsErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * Monta o corpo do POST a partir do que o utilizador escreveu.
 *
 * Duas decisões que não são óbvias:
 *
 * 1. Os opcionais são OMITIDOS quando estão vazios, nunca enviados como "".
 *    O backend usa `optional({ values: "falsy" })` e saltaria a regra, mas
 *    mandar a chave na mesma transforma a ausência de resposta num campo
 *    vazio no payload — e um 400 por isso seria confuso de diagnosticar.
 *
 * 2. `startAt` é copiado tal e qual. É o valor que veio da disponibilidade, já
 *    com deslocamento, e é o único que o backend valida
 *    (`HAS_TIMEZONE_OFFSET`). Reconstruí-lo a partir da data e da hora mostradas
 *    seria trocar instantes e arriscar marcar na hora errada.
 */
export function buildBookingPayload(
  selection: { serviceId: string; employeeId: string; startAt: string },
  details: ClientDetailsInput,
): CreatePublicAppointmentPayload {
  const payload: CreatePublicAppointmentPayload = {
    serviceId: selection.serviceId,
    employeeId: selection.employeeId,
    startAt: selection.startAt,
    clientName: details.clientName.trim(),
    clientEmail: details.clientEmail.trim(),
  };

  const phone = details.clientPhone.trim();
  if (phone.length > 0) {
    payload.clientPhone = phone;
  }

  const notes = details.notes.trim();
  if (notes.length > 0) {
    payload.notes = notes;
  }

  return payload;
}

/**
 * Chave estável para o botão de horário.
 *
 * Usa `startAt` e não a hora já formatada: a hora é o que se apresenta, o
 * instante é o que identifica o horário, e dois slots podem ter a mesma
 * "HH:mm" em dias diferentes.
 */
export function getSlotKey(slot: PublicAvailabilitySlot): string {
  return slot.startAt;
}

/**
 * Adapta o `avatarUrl` do contrato público para o input de `ImageAvatar`.
 *
 * Igual a `toPublicAvatarImage` da gestão: o `publicId` nunca sai do backend
 * num pedido público, e inventar um seria pior do que uma string vazia. Sem URL
 * fica `null` e o componente desenha as iniciais.
 */
export function toBookingAvatarImage(
  avatarUrl: string | null | undefined,
): StoredImage | null {
  const url = avatarUrl?.trim();
  return url ? { url, publicId: "" } : null;
}