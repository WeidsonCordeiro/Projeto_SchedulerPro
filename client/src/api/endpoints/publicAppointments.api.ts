import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  PublicAppointment,
  UpdatePublicAppointmentPayload,
} from "../../types/publicAppointment";

/**
 * API pública do agendamento, por link.
 *
 * Espelha `PublicAppointmentRoutes.ts`
 * (server/src/modules/appointments/routes/PublicAppointmentRoutes.ts):
 *
 *   GET    /api/public/appointments/:token
 *   PATCH  /api/public/appointments/:token
 *   DELETE /api/public/appointments/:token
 *
 * Não usa `appointmentsApi`: são rotas sem autenticação, com contrato
 * estreito e token como credencial. Misturá-las no mesmo objeto deixaria
 * ambíguo qual chamada exige sessão.
 *
 * O `apiClient` é o mesmo instance de sempre (mesmo `baseURL`, mesmos
 * interceptors de refresh) — não há uma segunda camada de HTTP, nem
 * interceptors duplicados.
 *
 * O token nunca é guardado: é lido da rota pelo componente e entra apenas
 * como argumento, no momento da chamada.
 */

/**
 * O token é base64url, portanto nunca precisa de escaping. Ainda assim é
 * codificado: um valor inesperado na URL não deve conseguir injectar um
 * separador de caminho nem mudar a rota que é chamada.
 */
function publicAppointmentUrl(token: string): string {
  return `/public/appointments/${encodeURIComponent(token)}`;
}

export const publicAppointmentsApi = {
  /** Consulta o agendamento pelo link. */
  async getByToken(token: string) {
    const { data } = await apiClient.get<ApiResponse<PublicAppointment>>(
      publicAppointmentUrl(token),
    );
    return data;
  },

  /**
   * Altera o agendamento pelo link.
   *
   * `payload` só pode conter `serviceId`, `employeeId`, `startAt` e `notes`:
   * o validator do backend recusa com 400 qualquer outra chave.
   */
  async updateByToken(token: string, payload: UpdatePublicAppointmentPayload) {
    const { data } = await apiClient.patch<ApiResponse<PublicAppointment>>(
      publicAppointmentUrl(token),
      payload,
    );
    return data;
  },

  /**
   * Cancela o agendamento pelo link.
   *
   * Sem body: o backend recusa com 400 qualquer campo enviado, `status`
   * incluído. Idempotente — cancelar um agendamento já cancelado devolve 200
   * com o estado atual.
   */
  async cancelByToken(token: string) {
    const { data } = await apiClient.delete<ApiResponse<PublicAppointment>>(
      publicAppointmentUrl(token),
    );
    return data;
  },
};

export default publicAppointmentsApi;