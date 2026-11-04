/**
 * Convite de conta CLIENT (Stage 32).
 *
 * O token É a credencial: viaja apenas no corpo dos pedidos
 * públicos (nunca na URL) e não é guardado no Redux nem em
 * storage.
 */

export interface ClientInviteInfo {
  clientName: string;
  companyName: string;
  email: string;
  expiresAt: string;
}

export interface InspectClientInvitePayload {
  token: string;
}

export interface AcceptClientInvitePayload {
  token: string;
  password: string;
  confirmPassword: string;
}

/**
 * Resposta da emissão autenticada (POST /clients/:id/invite):
 * o token nunca aparece aqui.
 */
export interface ClientInviteEmission {
  expiresAt: string;
}
