import { describe, expect, it, vi } from "vitest";
import availabilityExceptionApi from "./availabilityExceptions.api";
import { httpError } from "../../test/http";

vi.mock("../apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

const { apiClient } = await import("../apiClient");

const listResponse = { success: true, message: "ok", data: [] };
const itemResponse = {
  success: true,
  message: "ok",
  data: {
    id: "exc1",
    companyId: "c1",
    employeeId: "e1",
    date: "2026-09-15",
    allDay: false,
    startTime: "10:00",
    endTime: "11:00",
    type: "BLOCK",
    reason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
};

describe("availabilityExceptionApi", () => {
  it("gets /availability-exceptions without filters", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: listResponse });

    await availabilityExceptionApi.getAvailabilityExceptions();

    expect(apiClient.get).toHaveBeenCalledWith("/availability-exceptions");
  });

  it("gets /availability-exceptions scoped by employee", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: listResponse });

    await availabilityExceptionApi.getAvailabilityExceptions("e1");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/availability-exceptions?employeeId=e1",
    );
  });

  it("encodes the employee filter", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: listResponse });

    await availabilityExceptionApi.getAvailabilityExceptions("e ê");

    expect(apiClient.get).toHaveBeenCalledWith(
      "/availability-exceptions?employeeId=e%20%C3%AA",
    );
  });

  it("gets /availability-exceptions/:id", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: itemResponse });

    await availabilityExceptionApi.getAvailabilityException("exc1");

    expect(apiClient.get).toHaveBeenCalledWith("/availability-exceptions/exc1");
  });

  it("posts /availability-exceptions with the create payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: itemResponse });

    await availabilityExceptionApi.createAvailabilityException({
      employeeId: "e1",
      date: "2026-09-15",
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
      type: "BLOCK",
      reason: null,
    });

    expect(apiClient.post).toHaveBeenCalledWith("/availability-exceptions", {
      employeeId: "e1",
      date: "2026-09-15",
      allDay: false,
      startTime: "10:00",
      endTime: "11:00",
      type: "BLOCK",
      reason: null,
    });
  });

  it("patches /availability-exceptions/:id with the update payload", async () => {
    vi.mocked(apiClient.patch).mockResolvedValue({ data: itemResponse });

    await availabilityExceptionApi.updateAvailabilityException("exc1", {
      allDay: true,
      startTime: null,
      endTime: null,
      reason: "Feriado",
    });

    expect(apiClient.patch).toHaveBeenCalledWith(
      "/availability-exceptions/exc1",
      { allDay: true, startTime: null, endTime: null, reason: "Feriado" },
    );
  });

  it("deletes /availability-exceptions/:id", async () => {
    vi.mocked(apiClient.delete).mockResolvedValue({
      data: { success: true, message: "removido", data: null },
    });

    await availabilityExceptionApi.deleteAvailabilityException("exc1");

    expect(apiClient.delete).toHaveBeenCalledWith("/availability-exceptions/exc1");
  });

  it("never sends companyId in any payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: itemResponse });
    vi.mocked(apiClient.patch).mockResolvedValue({ data: itemResponse });

    await availabilityExceptionApi.createAvailabilityException({
      employeeId: "e1",
      date: "2026-09-15",
      allDay: true,
      startTime: null,
      endTime: null,
      type: "HOLIDAY",
      reason: "",
    });
    await availabilityExceptionApi.updateAvailabilityException("exc1", {
      reason: "Atualizado",
    });

    const postPayload = vi.mocked(apiClient.post).mock.calls[0][1];
    const patchPayload = vi.mocked(apiClient.patch).mock.calls[0][1];
    expect(postPayload).not.toHaveProperty("companyId");
    expect(patchPayload).not.toHaveProperty("companyId");
  });

  it("propagates API errors to the caller", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    await expect(availabilityExceptionApi.getAvailabilityExceptions()).rejects.toMatchObject(
      { response: { status: 500 } },
    );
  });
});