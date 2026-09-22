import { describe, expect, it, vi } from "vitest";
import reportsApi from "./reports.api";
import { httpError } from "../../test/http";

vi.mock("../apiClient", () => ({
  apiClient: { get: vi.fn() },
}));

const { apiClient } = await import("../apiClient");

const RANGE = { startAt: "2026-08-31T23:00:00.000Z", endAt: "2026-09-30T23:00:00.000Z" };

function mockData() {
  vi.mocked(apiClient.get).mockResolvedValue({
    data: { success: true, message: "ok", data: null },
  });
}

describe("reportsApi", () => {
  it("gets /reports/overview", async () => {
    mockData();
    await reportsApi.getOverview();
    expect(apiClient.get).toHaveBeenCalledWith("/reports/overview");
  });

  it("gets /reports/overview with period params", async () => {
    mockData();
    await reportsApi.getOverview(RANGE);
    expect(apiClient.get).toHaveBeenCalledWith("/reports/overview", {
      params: RANGE,
    });
  });

  it("gets /reports/revenue", async () => {
    mockData();
    await reportsApi.getRevenue();
    expect(apiClient.get).toHaveBeenCalledWith("/reports/revenue");
  });

  it("gets /reports/revenue with period params", async () => {
    mockData();
    await reportsApi.getRevenue(RANGE);
    expect(apiClient.get).toHaveBeenCalledWith("/reports/revenue", {
      params: RANGE,
    });
  });

  it("gets /reports/top-services", async () => {
    mockData();
    await reportsApi.getTopServices();
    expect(apiClient.get).toHaveBeenCalledWith("/reports/top-services");
  });

  it("gets /reports/top-services with period and limit", async () => {
    mockData();
    await reportsApi.getTopServices({ ...RANGE, limit: 3 });
    expect(apiClient.get).toHaveBeenCalledWith("/reports/top-services", {
      params: { ...RANGE, limit: 3 },
    });
  });

  it("gets /reports/employees", async () => {
    mockData();
    await reportsApi.getEmployees();
    expect(apiClient.get).toHaveBeenCalledWith("/reports/employees");
  });

  it("gets /reports/employees with period params", async () => {
    mockData();
    await reportsApi.getEmployees(RANGE);
    expect(apiClient.get).toHaveBeenCalledWith("/reports/employees", {
      params: RANGE,
    });
  });

  it("gets /reports/clients", async () => {
    mockData();
    await reportsApi.getClients();
    expect(apiClient.get).toHaveBeenCalledWith("/reports/clients");
  });

  it("gets /reports/clients with period and limit", async () => {
    mockData();
    await reportsApi.getClients({ ...RANGE, limit: 10 });
    expect(apiClient.get).toHaveBeenCalledWith("/reports/clients", {
      params: { ...RANGE, limit: 10 },
    });
  });

  it("gets /reports/cancellations", async () => {
    mockData();
    await reportsApi.getCancellations();
    expect(apiClient.get).toHaveBeenCalledWith("/reports/cancellations");
  });

  it("gets /reports/cancellations with period params", async () => {
    mockData();
    await reportsApi.getCancellations(RANGE);
    expect(apiClient.get).toHaveBeenCalledWith("/reports/cancellations", {
      params: RANGE,
    });
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(reportsApi.getOverview()).rejects.toMatchObject({
      response: { status: 500 },
    });
  });
});