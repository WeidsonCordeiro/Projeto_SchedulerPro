import { beforeEach, describe, expect, it, vi } from "vitest";
import publicBookingApi from "./publicBooking.api";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

// Sem isto, `mock.calls[0]` numa asserção apontaria para o teste anterior.
beforeEach(() => {
  vi.clearAllMocks();
});

const COMPANY_ID = "507f1f77bcf86cd799439012";

const service = {
  id: "svc1",
  name: "Corte de cabelo",
  description: "Mantenha o corte",
  durationMinutes: 45,
  price: 25,
};

const employee = { id: "emp1", name: "João Silva", avatarUrl: null };

const availability = {
  date: "2026-10-08",
  timezone: "Europe/Lisbon",
  slots: [{ startAt: "2026-10-08T09:00:00.000+01:00", endAt: "2026-10-08T09:45:00.000+01:00" }],
};

function ok<T>(data: T) {
  return { data: { success: true, message: "ok", data } };
}

describe("publicBookingApi", () => {
  describe("getServices", () => {
    it("gets /public/companies/:companyId/services", async () => {
      vi.mocked(apiClient.get).mockResolvedValue(ok([service]));

      const result = await publicBookingApi.getServices(COMPANY_ID);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/public/companies/${COMPANY_ID}/services`,
      );
      expect(result).toEqual([service]);
    });

    it("encodes the companyId so it cannot inject another path segment", async () => {
      vi.mocked(apiClient.get).mockResolvedValue(ok([]));

      await publicBookingApi.getServices("../../admin");

      expect(apiClient.get).toHaveBeenCalledWith(
        "/public/companies/..%2F..%2Fadmin/services",
      );
    });

    it("throws instead of pretending that a missing body means 'no services'", async () => {
      // Um 200 sem `data` é quebra de contrato. Devolver `[]` seria mostrar
      // "não existem serviços" ao cliente e esconder o problema real.
      vi.mocked(apiClient.get).mockResolvedValue({
        data: { success: true, message: "ok" },
      });

      await expect(publicBookingApi.getServices(COMPANY_ID)).rejects.toThrow(
        /200 sem data/,
      );
    });
  });

  describe("getEmployees", () => {
    it("gets /public/companies/:companyId/employees", async () => {
      vi.mocked(apiClient.get).mockResolvedValue(ok([employee]));

      const result = await publicBookingApi.getEmployees(COMPANY_ID);

      expect(apiClient.get).toHaveBeenCalledWith(
        `/public/companies/${COMPANY_ID}/employees`,
      );
      expect(result).toEqual([employee]);
    });

    it("does not take a serviceId, because the backend has no service × employee relation", async () => {
      vi.mocked(apiClient.get).mockResolvedValue(ok([employee]));

      await publicBookingApi.getEmployees(COMPANY_ID);

      const [url, config] = vi.mocked(apiClient.get).mock.calls[0];
      expect(url).not.toContain("serviceId");
      expect(config).toBeUndefined();
    });
  });

  describe("getAvailability", () => {
    it("passes serviceId, employeeId and the calendar date as query params", async () => {
      vi.mocked(apiClient.get).mockResolvedValue(ok(availability));

      const result = await publicBookingApi.getAvailability(COMPANY_ID, {
        serviceId: "svc1",
        employeeId: "emp1",
        date: "2026-10-08",
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        `/public/companies/${COMPANY_ID}/availability`,
        {
          params: {
            serviceId: "svc1",
            employeeId: "emp1",
            date: "2026-10-08",
          },
        },
      );
      expect(result).toEqual(availability);
    });

    it("sends the date untouched, so the company calendar day is preserved", async () => {
      vi.mocked(apiClient.get).mockResolvedValue(ok(availability));

      await publicBookingApi.getAvailability(COMPANY_ID, {
        serviceId: "svc1",
        employeeId: "emp1",
        date: "2026-10-08",
      });

      const [, config] = vi.mocked(apiClient.get).mock.calls[0];
      // Não deve virar um instante ISO: o backend compara com períodos
      // locais da empresa e mudaria o dia consoante o fuso.
      expect(config?.params as Record<string, string>).toEqual({
        serviceId: "svc1",
        employeeId: "emp1",
        date: "2026-10-08",
      });
      expect(
        String((config?.params as Record<string, string>).date),
      ).not.toContain("T");
    });
  });

  describe("createAppointment", () => {
    const payload = {
      serviceId: "svc1",
      employeeId: "emp1",
      startAt: "2026-10-08T09:00:00.000+01:00",
      clientName: "Maria Silva",
      clientEmail: "maria@example.com",
    };

    it("posts the payload to /public/companies/:companyId/appointments", async () => {
      const created = {
        appointment: { id: "apt1", status: "scheduled" },
        publicAccessToken: "tok123",
      };
      vi.mocked(apiClient.post).mockResolvedValue(ok(created));

      const result = await publicBookingApi.createAppointment(
        COMPANY_ID,
        payload,
      );

      expect(apiClient.post).toHaveBeenCalledWith(
        `/public/companies/${COMPANY_ID}/appointments`,
        payload,
      );
      expect(result).toEqual(created);
    });

    it("does not add companyId or server-derived fields to the body", async () => {
      vi.mocked(apiClient.post).mockResolvedValue(
        ok({ appointment: {}, publicAccessToken: "tok" }),
      );

      await publicBookingApi.createAppointment(COMPANY_ID, payload);

      const [, body] = vi.mocked(apiClient.post).mock.calls[0];
      // O backend recusa com 400 qualquer chave fora de
      // PUBLIC_APPOINTMENT_FIELDS, e companyId/endAt/status/price não lá estão.
      expect(Object.keys(body as object).sort()).toEqual([
        "clientEmail",
        "clientName",
        "employeeId",
        "serviceId",
        "startAt",
      ]);
    });
  });

  it("propagates failures instead of masking them", async () => {
    const failure = new Error("Request failed");
    vi.mocked(apiClient.get).mockRejectedValue(failure);

    await expect(publicBookingApi.getServices(COMPANY_ID)).rejects.toBe(failure);
  });
});