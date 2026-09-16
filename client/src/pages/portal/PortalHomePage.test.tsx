import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalHomePage from "./PortalHomePage";
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
      <MemoryRouter initialEntries={["/portal"]}>
        <PortalHomePage />
      </MemoryRouter>
    </Provider>,
  );
}

describe("PortalHomePage", () => {
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

  it("shows empty state when there are no upcoming appointments", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(
      await screen.findByText(/não possui agendamentos futuros/i),
    ).toBeInTheDocument();
  });

  it("renders upcoming appointments with service name, employee name and status", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        {
          id: "apt1",
          companyId: "comp1",
          clientId: "client1",
          serviceId: "svc1",
          employeeId: "emp1",
          startAt: "2026-12-01T10:00:00.000Z",
          endAt: "2026-12-01T10:30:00.000Z",
          status: "scheduled",
          notes: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          serviceName: "Corte de Cabelo",
          employeeName: "Maria",
        },
      ],
    });

    renderPage();

    expect(await screen.findByText("Corte de Cabelo")).toBeInTheDocument();
    expect(screen.getByText(/Maria/)).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
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

  it("renders quick access links", async () => {
    vi.mocked(appointmentsApi.getMyAppointments).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderPage();

    expect(await screen.findByText(/próximos agendamentos/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /meus agendamentos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /meu perfil/i }),
    ).toBeInTheDocument();
  });
});