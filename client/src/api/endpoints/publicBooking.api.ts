import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  CreatePublicAppointmentPayload,
  CreatePublicAppointmentResult,
  PublicAvailability,
  PublicEmployee,
  PublicService,
} from "../../types/publicBooking";

/**
 * API do fluxo público de agendamento (Partes 1 e 4 do backend).
 *
 * Fica em `api/endpoints/` ao lado de `publicAppointments.api.ts`, que trata
 * do MESMO consumidor pelo outro lado do fluxo (gerir um agendamento já
 * existente por token). Fica separado porque o contrato, a forma de obtener
 * o tenant e o tratamento de erro são diferentes:
 *
 *   publicAppointments.api  → /public/appointments/:token   (credencial = token)
 *   publicBooking.api       → /public/companies/:companyId/... (credencial = nenhuma)
 *
 * Nenhuma destas chamadas exige autenticação. `apiClient` é o mesmo de sempre
 * (mesmo `baseURL`, mesmos interceptors) — não há uma segunda camada de HTTP.
 *
 * O `companyId` entra SEMPRE na URL e nunca no corpo: é o tenant, e o backend
 * recusa com 400 qualquer `companyId` enviado no `POST`.
 */

/**
 * Prefixo das rotas públicas de uma empresa.
 *
 * `companyId` é codificado pelo mesmo motivo do token em
 * `publicAppointments.api`: um valor inesperado na URL não deve conseguir
 * injectar um separador de caminho nem escolher outra rota.
 */
function companyPath(companyId: string, resource: string): string {
  return `/public/companies/${encodeURIComponent(companyId)}/${resource}`;
}

/**
 * Desembrulha `data` do envelope, ou falha alto se ele não vier.
 *
 * `ApiResponse.data` é opcional por definição, mas estas quatro rotas respondem
 * SEMPRE com um corpo — um `200` sem `data` é uma quebra de contrato, não um
 * estado legítimo que a página tenha de desenhar.
 *
 * Concentrar a verificação aqui evita que cada chamada devolva `T | undefined` e
 * empurre o `undefined` para dentro de `useState`, onde passaria a ser
 * indistinguível de "ainda não carregou". Lançar uma exceção normal significa
 * que o `.catch` de cada método a trata como as demais falhas, com a diferença
 * de não prometer ao utilizador que a empresa "não tem serviços".
 */
function requireData<T>(response: ApiResponse<T>, resource: string): T {
  if (response.data === undefined) {
    throw new Error(
      `Resposta sem corpo de dados em ${resource}. A API devolveu 200 sem data.`,
    );
  }
  return response.data;
}

export interface PublicAvailabilityQuery {
  serviceId: string;
  employeeId: string;
  /** Data de calendário local da empresa, "AAAA-MM-DD" — nunca um instante. */
  date: string;
}

export const publicBookingApi = {
  /** Serviços ativos da empresa. */
  async getServices(companyId: string) {
    const { data } = await apiClient.get<ApiResponse<PublicService[]>>(
      companyPath(companyId, "services"),
    );
    return requireData(data, "GET services");
  },

  /**
   * Profissionais ativos da empresa.
   *
   * Não recebe `serviceId`: não existe relação serviço × profissional
   * (ver Part 4), pelo que filtrar aqui mostraria menos do que a empresa
   * aceita de facto.
   */
  async getEmployees(companyId: string) {
    const { data } = await apiClient.get<ApiResponse<PublicEmployee[]>>(
      companyPath(companyId, "employees"),
    );
    return requireData(data, "GET employees");
  },

  /**
   * Horários livres de um serviço, profissional e data.
   *
   * A data vai como parâmetros de query, sempre em "AAAA-MM-DD". Não é
   * reconstruída a partir de `startAt`: o backend trata-a como dia de
   * calendário no timezone da empresa, e mandar um instante tornaria a
   * fronteira entre os dois ambígua.
   */
  async getAvailability(companyId: string, query: PublicAvailabilityQuery) {
    const { data } = await apiClient.get<ApiResponse<PublicAvailability>>(
      companyPath(companyId, "availability"),
      { params: query },
    );
    return requireData(data, "GET availability");
  },

  /**
   * Cria o agendamento.
   *
   * Sem `companyId` no corpo (é o tenant da URL) e sem qualquer campo derivado
   * (`endAt`, `status`, `price`): o backend calcula-os e recusa com 400
   * qualquer chave fora de `PUBLIC_APPOINTMENT_FIELDS`.
   */
  async createAppointment(
    companyId: string,
    payload: CreatePublicAppointmentPayload,
  ) {
    const { data } = await apiClient.post<
      ApiResponse<CreatePublicAppointmentResult>
    >(companyPath(companyId, "appointments"), payload);
    return requireData(data, "POST appointments");
  },
};

export default publicBookingApi;