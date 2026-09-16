import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalAppointmentsPage from "./PortalAppointmentsPage";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { httpError } from "../../test/http";
import { clientUser } from "../../test/fixtures";
import authReducer from "../../store/slices/authSlice";

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: {
    getMyAppointments: vi.fn(),
  },
}));

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { ...clientUser, clientId: "client1" },
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/portal/agendamentos"]}>
        <PortalAppointmentsPage />
      </MemoryRouter>
    </Provider>,
  );
}

const futureAppointment = {
  id: "apt1",
  companyId: "comp1",
  clientId: "client1",
  serviceId: "svc1",
  employeeId: "emp1",
  startAt: "2026-12-01T10:00:00.000Z",
  endAt: "2026-12-01T10:30:00.000Z",
  status: "scheduled" as const,
  notes: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  serviceName: "Corte de Cabelo",
  employeeName: "Maria",
};

const pastAppointment = {
  ...futureAppointment,
  id: "apt2",
  startAt: "2025-06-01T10:00:00.000Z",
  endAt: "2025-06-01T10:30:00.000Z",
  status: "completed" as const,
  serviceName: "Barba",
  employeeName: "João",
};

describe("PortalAppointmentsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a loading spinner while data loads", () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockReturnValue(
      new Promise(() => {}),
    );

    renderPage();

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows empty state when there are no appointments", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(
      await screen.findByText("Nenhum agendamento encontrado."),
    ).toBeInTheDocument();
  });

  it("renders all appointments in the table", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [futureAppointment, pastAppointment],
    });

    renderPage();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Corte de Cabelo")).toBeInTheDocument();
    expect(within(table).getByText("Barba")).toBeInTheDocument();
    expect(within(table).getByText("Maria")).toBeInTheDocument();
    expect(within(table).getByText("João")).toBeInTheDocument();
  });

  it("shows an error and retry button on load failure", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(
      screen.getByRole("button", { name: /tentar novamente/i }),
    ).toBeInTheDocument();
  });

  it("filters to show only upcoming appointments", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [futureAppointment, pastAppointment],
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /próximos/i }));

    const table = screen.getByRole("table");
    expect(within(table).getByText("Corte de Cabelo")).toBeInTheDocument();
    expect(within(table).queryByText("Barba")).not.toBeInTheDocument();
  });

  it("filters to show only past appointments", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [futureAppointment, pastAppointment],
    });

    renderPage();
    await screen.findByRole("table");

    fireEvent.click(screen.getByRole("button", { name: /passados/i }));

    const table = screen.getByRole("table");
    expect(within(table).queryByText("Corte de Cabelo")).not.toBeInTheDocument();
    expect(within(table).getByText("Barba")).toBeInTheDocument();
  });
});