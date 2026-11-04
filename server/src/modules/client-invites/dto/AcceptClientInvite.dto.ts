/**
 * ==========================================================
 * Arquivo: AcceptClientInvite.dto
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir o contrato de campos aceites na consulta e no
 * aceite de um convite.
 *
 * As listas são usadas pelos validators para rejeitar campos
 * inesperados (mass assignment): o frontend NUNCA escolhe
 * `companyId`, `role` nem `clientId` — estes valores são
 * derivados pelo backend a partir do convite e do registo
 * confiável do Client.
 * ==========================================================
 */

export interface InspectClientInviteDto {
  token: string;
}

export interface AcceptClientInviteDto {
  token: string;
  password: string;
  confirmPassword: string;
}

export const INSPECT_CLIENT_INVITE_FIELDS = ["token"] as const;

export const ACCEPT_CLIENT_INVITE_FIELDS = [
  "token",
  "password",
  "confirmPassword",
] as const;
