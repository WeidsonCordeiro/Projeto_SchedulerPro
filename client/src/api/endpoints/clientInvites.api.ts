import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  AcceptClientInvitePayload,
  ClientInviteInfo,
  InspectClientInvitePayload,
} from "../../types/clientInvite";

/**
 * Superfície PÚBLICA dos convites de conta CLIENT.
 *
 * Ambos os pedidos são POST com o token no CORPO: um token em
 * path apareceria nos registos de acesso e transformaria a
 * própria credencial em log. Não há token de sessão — o
 * convite é a autorização, com expiração e uso único.
 */
export const clientInvitesApi = {
  /** POST /public/client-invites/inspect — estado do convite. */
  async inspect(payload: InspectClientInvitePayload) {
    const { data } = await apiClient.post<ApiResponse<ClientInviteInfo>>(
      "/public/client-invites/inspect",
      payload,
    );
    return data;
  },

  /** POST /public/client-invites/accept — cria a conta CLIENT. */
  async accept(payload: AcceptClientInvitePayload) {
    const { data } = await apiClient.post<ApiResponse<{ email: string }>>(
      "/public/client-invites/accept",
      payload,
    );
    return data;
  },
};

export default clientInvitesApi;
