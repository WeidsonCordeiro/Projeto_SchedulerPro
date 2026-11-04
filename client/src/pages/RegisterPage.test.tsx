import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Settings } from "luxon";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage from "./RegisterPage";
import authApi from "../api/endpoints/auth.api";
import * as timezones from "../config/timezones";
import { formatTimezoneOptionLabel } from "../config/timezones";
import { httpError } from "../test/http";
import authReducer from "../store/slices/authSlice";

vi.mock("../api/endpoints/auth.api", () => ({
  default: {
    register: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    refresh: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
    changePassword: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock("../api/endpoints/company.api", () => ({
  default: {
    getCompany: vi.fn(),
  },
}));

import companyApi from "../api/endpoints/company.api";
import companyReducer from "../store/slices/companySlice";
import { company, session } from "../test/fixtures";

function mockViewportDesktop() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

function makeStore(overrides: Partial<{ isLoading: boolean }> = {}) {
  return configureStore({
    reducer: { auth: authReducer, company: companyReducer },
    preloadedState: {
      auth: {
        user: null,
        mustChangePassword: false,
        isAuthenticated: false,
        isInitializing: false,
        isLoading: overrides.isLoading ?? false,
      },
    },
  });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={["/register"]}>
        <RegisterPage />
      </MemoryRouter>
    </Provider>,
  );
}

function getTimezoneCombobox() {
  return screen.getByRole("combobox", { name: "Fuso horário" });
}

function openTimezonePicker() {
  fireEvent.click(getTimezoneCombobox());
}

function selectTimezoneBySearch(iana: string) {
  openTimezonePicker();
  fireEvent.change(screen.getByRole("searchbox"), {
    target: { value: iana },
  });
  fireEvent.click(
    screen.getByRole("option", {
      name: formatTimezoneOptionLabel(iana),
    }),
  );
}

function fillValidRegistrationFields() {
  fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Owner" } });
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "owner@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Senha"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Confirmar senha"), {
    target: { value: "password123" },
  });
  fireEvent.change(screen.getByLabelText("Nome da empresa"), {
    target: { value: "My Company" },
  });
}

describe("RegisterPage", () => {
  let previousDefaultZone: typeof Settings.defaultZone;

  beforeEach(() => {
    previousDefaultZone = Settings.defaultZone;
    Settings.defaultZone = "Europe/Lisbon";
    vi.clearAllMocks();
    mockViewportDesktop();
    vi.mocked(companyApi.getCompany).mockResolvedValue({
      success: true,
      message: "ok",
      data: [company],
    });
  });

  afterEach(() => {
    Settings.defaultZone = previousDefaultZone;
    vi.restoreAllMocks();
  });

  it("renders the registration form", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: /criar conta/i })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Confirmar senha")).toBeInTheDocument();
    expect(screen.getByLabelText("Nome da empresa")).toBeInTheDocument();
    expect(getTimezoneCombobox()).toBeInTheDocument();
  });

  it("initializes the timezone from getDefaultTimezone using Luxon Settings", () => {
    Settings.defaultZone = "America/Sao_Paulo";
    renderPage();

    expect(getTimezoneCombobox()).toHaveTextContent(
      formatTimezoneOptionLabel("America/Sao_Paulo"),
    );
  });

  it("searches and selects a timezone different from the default", () => {
    renderPage();
    selectTimezoneBySearch("America/New_York");

    expect(getTimezoneCombobox()).toHaveTextContent(
      formatTimezoneOptionLabel("America/New_York"),
    );
  });

  it("validates required fields", async () => {
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByText("O nome é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O email é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("A senha é obrigatória.")).toBeInTheDocument();
    expect(screen.getByText("Confirme a senha.")).toBeInTheDocument();
    expect(screen.getByText("O nome da empresa é obrigatório.")).toBeInTheDocument();
  });

  it("validates password minimum length", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "short" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "Test Company" } });

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(
      await screen.findByText("A senha deve possuir pelo menos 8 caracteres."),
    ).toBeInTheDocument();
  });

  it("validates password confirmation match", async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText("Nome"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "test@example.com" } });
    fireEvent.change(screen.getByLabelText("Senha"), { target: { value: "password123" } });
    fireEvent.change(screen.getByLabelText("Confirmar senha"), { target: { value: "different" } });
    fireEvent.change(screen.getByLabelText("Nome da empresa"), { target: { value: "Test Company" } });

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(
      await screen.findByText("As senhas não coincidem."),
    ).toBeInTheDocument();
  });

  it("shows timezone validation when IANA validation fails", async () => {
    const spy = vi.spyOn(timezones, "isValidIanaTimezone").mockReturnValue(false);
    renderPage();
    fillValidRegistrationFields();

    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(
      await screen.findByText("Selecione um fuso horário válido."),
    ).toBeInTheDocument();
    expect(authApi.register).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it("calls register with the selected IANA timezone in the payload", async () => {
    vi.mocked(authApi.register).mockResolvedValue({
      success: true,
      message: "ok",
      data: session,
    });

    const store = makeStore();
    renderPage(store);

    fillValidRegistrationFields();
    selectTimezoneBySearch("America/Sao_Paulo");
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(
      await screen.findByRole("button", { name: /criando conta/i }),
    ).toBeInTheDocument();
    expect(authApi.register).toHaveBeenCalledWith({
      name: "Owner",
      email: "owner@example.com",
      password: "password123",
      confirmPassword: "password123",
      company: {
        name: "My Company",
        timezone: "America/Sao_Paulo",
      },
    });

    const payload = vi.mocked(authApi.register).mock.calls[0][0];
    expect(payload.company.timezone).not.toMatch(/^\(UTC/);
    expect(companyApi.getCompany).toHaveBeenCalledTimes(1);
    expect(store.getState().company.company?.name).toBe("salao do centro");
  });

  it("disables the timezone picker while auth loading is true", () => {
    renderPage(makeStore({ isLoading: true }));

    expect(getTimezoneCombobox()).toBeDisabled();
    expect(screen.getByRole("button", { name: /criando conta/i })).toBeDisabled();
  });

  it("shows server errors", async () => {
    vi.mocked(authApi.register).mockRejectedValue(
      httpError(409, { message: "Email já está em uso." }),
    );

    renderPage();
    fillValidRegistrationFields();
    fireEvent.click(screen.getByRole("button", { name: /criar conta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Email já está em uso.");
  });

  it("shows a link to login", () => {
    renderPage();

    expect(
      screen.getByRole("link", { name: /entrar/i }),
    ).toBeInTheDocument();
  });
});
