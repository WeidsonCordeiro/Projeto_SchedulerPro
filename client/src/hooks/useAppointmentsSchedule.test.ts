import { act, renderHook, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import type { ReactNode } from "react";
import { createElement } from "react";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import appointmentsApi from "../api/endpoints/appointments.api";
import clientsApi from "../api/endpoints/clients.api";
import servicesApi from "../api/endpoints/services.api";
import employeesApi from "../api/endpoints/employees.api";
import { httpError } from "../test/http";
import type { Appointment } from "../types/appointment";
import type { Client } from "../types/client";
import type { Employee } from "../types/employee";
import type { Service } from "../types/service";
import {
  computeAppointmentsRange,
  useAppointmentsSchedule,
  type UseAppointmentsScheduleOptions,
} from "./useAppointmentsSchedule";
import authReducer from "../store/slices/authSlice";
import companyReducer from "../store/slices/companySlice";

function createHookWrapper() {
  const store = configureStore({
    reducer: { auth: authReducer, company: companyReducer },
  });
  return function HookWrapper({ children }: { children: ReactNode }) {
    return createElement(Provider, { store, children });
  };
}

const hookOptions = { wrapper: createHookWrapper() };

vi.mock("../api/endpoints/appointments.api", () => ({
  default: { getAppointments: vi.fn() },
}));

vi.mock("../api/endpoints/clients.api", () => ({
  default: { getClients: vi.fn() },
}));

vi.mock("../api/endpoints/services.api", () => ({
  default: { getServices: vi.fn() },
}));

vi.mock("../api/endpoints/employees.api", () => ({
  default: { getEmployees: vi.fn() },
}));

const defaultAppointment: Appointment = {
  id: "appt1",
  companyId: "company1",
  clientId: "client1",
  serviceId: "service1",
  employeeId: "employee1",
  startAt: "2026-09-15T09:00:00.000Z",
  endAt: "2026-09-15T09:30:00.000Z",
  status: "scheduled",
  notes: null,
  createdAt: "2026-07-01T10:00:00.000Z",
  updatedAt: "2026-07-01T10:00:00.000Z",
};

const defaultClient: Client = {
  id: "client1",
  name: "Maria Silva",
  email: "maria@example.com",
  phone: "912345678",
  companyId: "company1",
  notes: null,
  isActive: true,
  portalAccess: { exists: false, isActive: false },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const defaultService: Service = {
  id: "service1",
  companyId: "company1",
  name: "Corte de cabelo",
  description: null,
  duration: 30,
  price: 15,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const defaultEmployee: Employee = {
  id: "employee1",
  name: "Ana Lima",
  email: "ana@example.com",
  companyId: "company1",
  role: "EMPLOYEE",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function baseOptions(
  overrides: Partial<UseAppointmentsScheduleOptions> = {},
): UseAppointmentsScheduleOptions {
  return {
    canList: true,
    viewType: "month",
    currentDateKey: "2026-09-10",
    timezone: "Europe/Lisbon",
    actorRole: "OWNER",
    canListEmployees: true,
    ...overrides,
  };
}

function mockRelatedSuccess() {
  vi.mocked(clientsApi.getClients).mockResolvedValue({
    success: true,
    message: "ok",
    data: [defaultClient],
  });
  vi.mocked(servicesApi.getServices).mockResolvedValue({
    success: true,
    message: "ok",
    data: [defaultService],
  });
  vi.mocked(employeesApi.getEmployees).mockResolvedValue({
    success: true,
    message: "ok",
    data: [defaultEmployee],
  });
}

describe("computeAppointmentsRange", () => {
  it("returns empty bounds for list view", () => {
    expect(
      computeAppointmentsRange("list", "2026-09-10", "Europe/Lisbon"),
    ).toEqual({ startAt: "", endAt: "" });
  });

  it("returns month grid bounds for month view", () => {
    const range = computeAppointmentsRange(
      "month",
      "2026-09-10",
      "Europe/Lisbon",
    );
    expect(range.startAt).toBeTruthy();
    expect(range.endAt).toBeTruthy();
  });
});

describe("useAppointmentsSchedule", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not fetch when canList is false", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    mockRelatedSuccess();

    renderHook(
      () => useAppointmentsSchedule(baseOptions({ canList: false })),
      hookOptions,
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(appointmentsApi.getAppointments).not.toHaveBeenCalled();
    expect(clientsApi.getClients).not.toHaveBeenCalled();
  });

  it("loads appointments without range for list view", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [defaultAppointment],
    });
    mockRelatedSuccess();

    const { result } = renderHook(() =>
      useAppointmentsSchedule(baseOptions({ viewType: "list" })),
      hookOptions,
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(appointmentsApi.getAppointments).toHaveBeenCalledWith(undefined);
    expect(result.current.appointments).toHaveLength(1);
  });

  it("loads appointments with range for month view", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [defaultAppointment],
    });
    mockRelatedSuccess();

    const { result } = renderHook(() =>
      useAppointmentsSchedule(
        baseOptions({ viewType: "month", currentDateKey: "2026-09-10" }),
      ),
      hookOptions,
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const rangedCall = vi
      .mocked(appointmentsApi.getAppointments)
      .mock.calls.find((call) => call[0]?.startAt && call[0]?.endAt);
    expect(rangedCall?.[0]).toMatchObject({
      startAt: expect.any(String),
      endAt: expect.any(String),
    });
  });

  it("refetches when viewType changes", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    mockRelatedSuccess();

    const { result, rerender } = renderHook(
      (options: UseAppointmentsScheduleOptions) =>
        useAppointmentsSchedule(options),
      { initialProps: baseOptions({ viewType: "month" }), ...hookOptions },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsAfterMount = vi.mocked(appointmentsApi.getAppointments).mock.calls
      .length;

    rerender(baseOptions({ viewType: "list" }));

    await waitFor(() =>
      expect(
        vi.mocked(appointmentsApi.getAppointments).mock.calls.length,
      ).toBeGreaterThan(callsAfterMount),
    );
    const listCall = vi
      .mocked(appointmentsApi.getAppointments)
      .mock.calls.find((call) => call[0] === undefined);
    expect(listCall).toBeDefined();
  });

  it("builds name maps when related data loads", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    mockRelatedSuccess();

    const { result } = renderHook(
      () => useAppointmentsSchedule(baseOptions()),
      hookOptions,
    );

    await waitFor(() =>
      expect(result.current.clientNames.get("client1")).toBe("Maria Silva"),
    );

    expect(result.current.relatedError).toBeNull();
    expect(result.current.serviceNames.get("service1")).toBe("Corte de cabelo");
    expect(result.current.employeeNames.get("employee1")).toBe("Ana Lima");
  });

  it("sets relatedError on partial related failures but keeps appointments", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [defaultAppointment],
    });
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [defaultClient],
    });
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [defaultService],
    });
    vi.mocked(employeesApi.getEmployees).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const { result } = renderHook(
      () => useAppointmentsSchedule(baseOptions()),
      hookOptions,
    );

    await waitFor(() => expect(result.current.relatedError).toContain(
      "Não foi possível carregar alguns nomes.",
    ));

    expect(result.current.appointments).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
  });

  it("sets loadError when appointments fail to load", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    mockRelatedSuccess();

    const { result } = renderHook(
      () => useAppointmentsSchedule(baseOptions()),
      hookOptions,
    );

    await waitFor(() =>
      expect(result.current.loadError).toBe("Erro interno do servidor."),
    );
    expect(result.current.isLoading).toBe(false);
  });

  it("retries appointments via loadAppointments", async () => {
    vi.mocked(appointmentsApi.getAppointments)
      .mockRejectedValueOnce(
        httpError(500, { message: "Erro interno do servidor." }),
      )
      .mockResolvedValue({
        success: true,
        message: "ok",
        data: [defaultAppointment],
      });
    mockRelatedSuccess();

    const { result } = renderHook(
      () => useAppointmentsSchedule(baseOptions()),
      hookOptions,
    );

    await waitFor(() => expect(result.current.loadError).toBeTruthy());

    await act(async () => {
      await result.current.loadAppointments();
    });

    expect(result.current.loadError).toBeNull();
    expect(result.current.appointments).toHaveLength(1);
  });

  it("does not fetch client names for CLIENT role", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    mockRelatedSuccess();

    renderHook(() =>
      useAppointmentsSchedule(
        baseOptions({ actorRole: "CLIENT", canListEmployees: false }),
      ),
      hookOptions,
    );

    await waitFor(() =>
      expect(appointmentsApi.getAppointments).toHaveBeenCalled(),
    );

    expect(clientsApi.getClients).not.toHaveBeenCalled();
    expect(servicesApi.getServices).not.toHaveBeenCalled();
  });

  it("filters CLIENT role employees from the list", async () => {
    vi.mocked(appointmentsApi.getAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    vi.mocked(clientsApi.getClients).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    vi.mocked(servicesApi.getServices).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    vi.mocked(employeesApi.getEmployees).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        defaultEmployee,
        { ...defaultEmployee, id: "client-emp", role: "CLIENT" },
      ],
    });

    const { result } = renderHook(
      () => useAppointmentsSchedule(baseOptions()),
      hookOptions,
    );

    await waitFor(() => expect(result.current.employees).toHaveLength(1));
    expect(result.current.employees[0].role).not.toBe("CLIENT");
  });
});
