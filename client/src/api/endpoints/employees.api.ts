import { apiClient } from "../apiClient";
import type { ApiResponse } from "../../types/api";
import type {
  Employee,
  CreateEmployeePayload,
  UpdateEmployeePayload,
} from "../../types/employee";

export const employeesApi = {
  async getEmployees() {
    const { data } = await apiClient.get<ApiResponse<Employee[]>>("/users");
    return data;
  },

  async getEmployee(id: string) {
    const { data } = await apiClient.get<ApiResponse<Employee>>(`/users/${id}`);
    return data;
  },

  async createEmployee(payload: CreateEmployeePayload) {
    const { data } = await apiClient.post<ApiResponse<Employee>>(
      "/users",
      payload,
    );
    return data;
  },

  async updateEmployee(id: string, payload: UpdateEmployeePayload) {
    const { data } = await apiClient.put<ApiResponse<Employee>>(
      `/users/${id}`,
      payload,
    );
    return data;
  },

  async activateEmployee(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Employee>>(
      `/users/${id}/activate`,
    );
    return data;
  },

  async deactivateEmployee(id: string) {
    const { data } = await apiClient.patch<ApiResponse<Employee>>(
      `/users/${id}/deactivate`,
    );
    return data;
  },

  async deleteEmployee(id: string) {
    const { data } = await apiClient.delete<ApiResponse<null>>(`/users/${id}`);
    return data;
  },

  /**
   * POST /users/:id/photo (multipart/form-data, campo "photo").
   * Envia/substitui a foto do funcionário. O backend valida formato e tamanho.
   * Não definimos Content-Type: o axios gera o boundary do multipart sozinho.
   */
  async uploadEmployeePhoto(id: string, file: File) {
    const formData = new FormData();
    formData.append("photo", file);
    const { data } = await apiClient.post<ApiResponse<Employee>>(
      `/users/${id}/photo`,
      formData,
    );
    return data;
  },

  /** DELETE /users/:id/photo. Remove a foto (idempotente no backend). */
  async removeEmployeePhoto(id: string) {
    const { data } = await apiClient.delete<ApiResponse<Employee>>(
      `/users/${id}/photo`,
    );
    return data;
  },
};

export default employeesApi;
