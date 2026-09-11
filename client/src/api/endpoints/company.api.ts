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
};

export default companyApi;