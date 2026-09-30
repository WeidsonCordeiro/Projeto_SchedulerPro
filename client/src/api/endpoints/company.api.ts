import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type { Company, UpdateCompanyPayload } from "../../types/company";

export const companyApi = {
  /**
   * GET /companies.
   *
   * O backend filtra a lista pelo companyId do usuário autenticado
   * (CompanyService.findAll usa req.user.companyId), portanto o resultado
   * contém apenas a empresa da sessão. Não há endpoint /companies/me;
   * este é o equivalente autenticado para leitura e o frontend NÃO envia
   * companyId.
   */
  async getCompany(): Promise<ApiResponse<Company[]>> {
    const { data } = await apiClient.get<ApiResponse<Company[]>>("/companies");
    return data;
  },

  /**
   * PATCH /companies/:id.
   *
   * O id é o companyId da sessão (AuthUser.companyId), nunca um valor
   * escolhido pelo usuário.
   */
  async updateCompany(id: string, payload: UpdateCompanyPayload) {
    const { data } = await apiClient.patch<ApiResponse<Company>>(
      `/companies/${id}`,
      payload,
    );
    return data;
  },

  /**
   * POST /companies/:id/logo (multipart/form-data, campo "logo").
   * Envia/substitui a logo da empresa. O axios gera o boundary do multipart.
   */
  async uploadCompanyLogo(id: string, file: File) {
    const formData = new FormData();
    formData.append("logo", file);
    const { data } = await apiClient.post<ApiResponse<Company>>(
      `/companies/${id}/logo`,
      formData,
    );
    return data;
  },

  /** DELETE /companies/:id/logo. Remove a logo (idempotente no backend). */
  async removeCompanyLogo(id: string) {
    const { data } = await apiClient.delete<ApiResponse<Company>>(
      `/companies/${id}/logo`,
    );
    return data;
  },
};

export default companyApi;