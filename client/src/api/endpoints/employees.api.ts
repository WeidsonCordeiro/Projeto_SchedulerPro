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
};

export default employeesApi;