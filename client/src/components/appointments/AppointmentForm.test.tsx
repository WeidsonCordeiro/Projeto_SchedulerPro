import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentForm from "./AppointmentForm";
import appointmentsApi from "../../api/endpoints/appointments.api";
import availabilityApi from "../../api/endpoints/availability.api";
import availabilityExceptionsApi from "../../api/endpoints/availabilityExceptions.api";
import { httpError } from "../../test/http";
import type { ApiResponse } from "../../types/api";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee } from "../../types/employee";
import type { Availability } from "../../types/availability";

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: {
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/availability.api", () => ({
  default: {
    getEmployeeAvailabilities: vi.fn(),
  },
}));

vi.mock("../../api/endpoints/availabilityExceptions.api", () => ({
  default: {
    getAvailabilityExceptions: vi.fn(),
  },
}));

/**
 * Fixa o relógio em 2026-09-10 para tornar o mês exibido pelo calendário
 * determinístico (Setembro/2026). Apenas a fonte "Date" é fakeada.
 */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
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
    ...overrides,
  };
}

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: "client1",
    name: "Maria Silva",
    email: "maria@example.com",
    phone: "912345678",
    companyId: "company1",
    notes: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: "service1",
    companyId: "company1",
    name: "Corte de cabelo",
    description: null,
    duration: 30,
    price: 15,
    isActive: true,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: "employee1",
    name: "Ana Lima",
    email: "ana@example.com",
    role: "EMPLOYEE",
    companyId: "company1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAvailability(dayOfWeek: number): Availability {
  return {
    id: `av-${dayOfWeek}`,
    companyId: "company1",
    employeeId: "employee1",
    dayOfWeek: dayOfWeek as Availability["dayOfWeek"],
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const weekAvailability = [0, 1, 2, 3, 4, 5, 6].map(makeAvailability);

const availabilityResponse = (data: Availability[]): ApiResponse<Availability[]> => ({
  success: true,
  message: "Disponibilidades carregadas com sucesso.",
  data,
});

const clients = [makeClient()];
const services = [makeService()];
const employees = [makeEmployee()];

function renderForm(props: Partial<React.ComponentProps<typeof AppointmentForm>> = {}) {
  const propsBase: React.ComponentProps<typeof AppointmentForm> = {
    isOpen: true,
    appointment: null,
    clients,
    services,
    employees,
    appointments: [],
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...props,
  };
  render(<AppointmentForm {...propsBase} />);
}

function getDialog() {
  return screen.getByRole("dialog");
}

async function selectEmployeeAndWaitForCalendar(employeeId: string, dialog: HTMLElement) {
  fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
    target: { value: employeeId },
  });
  await screen.findByRole("button", { name: "2026-09-15" });
}

describe("AppointmentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(availabilityApi.getEmployeeAvailabilities).mockResolvedValue(
      availabilityResponse(weekAvailability),
    );
    vi.mocked(availabilityExceptionsApi.getAvailabilityExceptions).mockResolvedValue(
      { success: true, message: "", data: [] },
    );
  });

  it("renders nothing while closed", () => {
    renderForm({ isOpen: false });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows required-field errors when submitting empty", () => {
    renderForm();

    fireEvent.click(within(getDialog()).getByRole("button", { name: /criar agendamento/i }));

    expect(screen.getByText("O cliente é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O serviço é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O funcionário é obrigatório.")).toBeInTheDocument();
    expect(
      screen.getByText("A data e hora do agendamento são obrigatórias."),
    ).toBeInTheDocument();
    expect(appointmentsApi.createAppointment).not.toHaveBeenCalled();
  });

  it("keeps inactive clients/services and CLIENT users out of the options", () => {
    renderForm({
      clients: [makeClient({ id: "inactive-client", name: "Cliente Inativo", isActive: false })],
      services: [makeService({ id: "inactive-service", name: "Serviço Inativo", isActive: false })],
      employees: [makeEmployee({ id: "client-user", name: "Usuário Cliente", role: "CLIENT" })],
    });

    expect(screen.queryByRole("option", { name: "Cliente Inativo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Serviço Inativo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Usuário Cliente" })).not.toBeInTheDocument();
  });

  it("keeps a now-inactive client/service visible when editing an appointment", async () => {
    renderForm({
      appointment: makeAppointment({
        clientId: "inactive-client",
        serviceId: "inactive-service",
      }),
      clients: [
        makeClient(),
        makeClient({ id: "inactive-client", name: "Cliente Inativo", isActive: false }),
      ],
      services: [
        makeService(),
        makeService({ id: "inactive-service", name: "Serviço Inativo", isActive: false }),
      ],
    });

    // Aguarda a disponibilidade carregar para não deixar atualização assíncrona.
    await screen.findByRole("button", { name: "2026-09-15" });

    expect(
      screen.getByRole("option", { name: "Cliente Inativo (inativo)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Serviço Inativo (inativo)" }),
    ).toBeInTheDocument();
  });

  it("shows smart hints before an employee and a service are chosen", async () => {
    renderForm();

    expect(
      screen.getByText("Selecione um funcionário para ver a disponibilidade."),
    ).toBeInTheDocument();

    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });
    await screen.findByRole("button", { name: "2026-09-15" });

    expect(
      screen.getByText("Selecione um serviço para visualizar os horários."),
    ).toBeInTheDocument();
  });

  it("shows a loading state while fetching availability", async () => {
    let resolve!: (value: ApiResponse<Availability[]>) => void;
    const pending = new Promise<ApiResponse<Availability[]>>((r) => {
      resolve = r;
    });
    vi.mocked(availabilityApi.getEmployeeAvailabilities).mockReturnValue(pending);

    renderForm();
    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });

    expect(within(dialog).getByText("Carregando disponibilidade...")).toBeInTheDocument();

    resolve(availabilityResponse(weekAvailability));
    expect(await screen.findByRole("button", { name: "2026-09-15" })).toBeInTheDocument();
  });

  it("shows an availability error and retries", async () => {
    vi.mocked(availabilityApi.getEmployeeAvailabilities)
      .mockRejectedValueOnce(httpError(500, { message: "Disponibilidade indisponível" }))
      .mockResolvedValueOnce(availabilityResponse(weekAvailability));

    renderForm();
    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("Disponibilidade indisponível");

    fireEvent.click(within(dialog).getByRole("button", { name: "Tentar novamente" }));

    expect(await screen.findByRole("button", { name: "2026-09-15" })).toBeInTheDocument();
  });

  it("tells when the employee has no registered availability", async () => {
    vi.mocked(availabilityApi.getEmployeeAvailabilities).mockResolvedValue(
      availabilityResponse([]),
    );

    renderForm();
    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee1" },
    });

    expect(
      await screen.findByText("Este funcionário não possui disponibilidade cadastrada."),
    ).toBeInTheDocument();
  });

  it("creates an appointment via the smart calendar without companyId", async () => {
    const created = makeAppointment({ id: "appt99" });
    vi.mocked(appointmentsApi.createAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento criado com sucesso.",
      data: created,
    });
    const onSaved = vi.fn();
    const onClose = vi.fn();
    renderForm({ onSaved, onClose });

    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Cliente"), { target: { value: "client1" } });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service1" } });
    await selectEmployeeAndWaitForCalendar("employee1", dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));
    expect(within(dialog).getByText("Terça-feira, 15 de setembro")).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "10:00" }));
    expect(within(dialog).getByText(/termina às 10:30/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Observações"), {
      target: { value: "Primeira visita" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /criar agendamento/i }));

    expect(appointmentsApi.createAppointment).toHaveBeenCalledWith({
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-09-15T09:00:00.000Z",
      notes: "Primeira visita",
    });
    expect(vi.mocked(appointmentsApi.createAppointment).mock.calls[0][0]).not.toHaveProperty(
      "companyId",
    );
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledWith(created);
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("edits an appointment with pre-filled values from the calendar", async () => {
    const updated = makeAppointment({ serviceId: "service2" });
    vi.mocked(appointmentsApi.updateAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento atualizado com sucesso.",
      data: updated,
    });
    const onSaved = vi.fn();
    renderForm({
      appointment: makeAppointment({ notes: "preferia de manhã" }),
      services: [
        makeService(),
        makeService({ id: "service2", name: "Barba", duration: 45 }),
      ],
      onSaved,
    });

    const dialog = getDialog();
    await screen.findByRole("button", { name: "2026-09-15" });

    expect(within(dialog).getByLabelText("Observações")).toHaveValue("preferia de manhã");
    expect(within(dialog).getByText(/termina às 10:30/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "2026-09-15" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getByRole("button", { name: "10:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service2" } });

    expect(within(dialog).queryByRole("button", { name: /^10:00$/ })).not.toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "10:30" }));
    expect(within(dialog).getByText(/termina às 11:15/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(appointmentsApi.updateAppointment).toHaveBeenCalledWith("appt1", {
      clientId: "client1",
      serviceId: "service2",
      employeeId: "employee1",
      startAt: "2026-09-15T09:30:00.000Z",
      notes: "preferia de manhã",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  });

  it("keeps the current appointment slot visible when it is no longer generated", async () => {
    renderForm({
      appointment: makeAppointment(),
      services: [makeService({ duration: 45 })],
      employees: [
        makeEmployee(),
        makeEmployee({ id: "employee2", name: "Bruno Dias" }),
      ],
    });

    const dialog = getDialog();
    await screen.findByRole("button", { name: "2026-09-15" });

    expect(within(dialog).queryByRole("button", { name: /^10:00$/ })).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "10:00 (horário atual do agendamento)" }),
    ).toBeDisabled();

    // Trocar de funcionário em edição limpa data/horário e remove o chip.
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee2" },
    });
    await waitFor(() =>
      expect(
        within(dialog).queryByText("10:00 (horário atual do agendamento)"),
      ).not.toBeInTheDocument(),
    );
  });

  it("preserves the current slot when the appointment service is unavailable", async () => {
    renderForm({
      appointment: makeAppointment({ serviceId: "ghost-service" }),
      services: [makeService({ id: "other", name: "Outro serviço" })],
    });

    const dialog = getDialog();
    await screen.findByRole("button", { name: "2026-09-15" });

    expect(within(dialog).queryByRole("button", { name: /^\d{2}:\d{2}$/ })).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "10:00 (horário atual do agendamento)" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByText(/demais horários desta data já estão ocupados/i),
    ).toBeInTheDocument();
  });

  it("does not offer slots when the service has a non-positive duration", async () => {
    renderForm({ services: [makeService({ duration: 0 })] });

    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Cliente"), { target: { value: "client1" } });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service1" } });
    await selectEmployeeAndWaitForCalendar("employee1", dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));

    expect(
      within(dialog).getByText("Não há horários disponíveis nesta data."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: /^\d{2}:\d{2}$/ })).not.toBeInTheDocument();
  });

  it("shows the empty message when a day has no free slots", async () => {
    vi.mocked(availabilityApi.getEmployeeAvailabilities).mockResolvedValue(
      availabilityResponse([
        {
          id: "av-short",
          companyId: "company1",
          employeeId: "employee1",
          dayOfWeek: 2,
          morningStart: "09:00",
          morningEnd: "09:15",
          afternoonStart: null,
          afternoonEnd: null,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );

    renderForm();
    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service1" } });
    await selectEmployeeAndWaitForCalendar("employee1", dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));

    expect(
      within(dialog).getByText("Não há horários disponíveis nesta data."),
    ).toBeInTheDocument();
  });

  it("reloads availability and clears the selection when the employee changes", async () => {
    renderForm({
      employees: [
        makeEmployee(),
        makeEmployee({ id: "employee2", name: "Bruno Dias" }),
      ],
    });

    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Cliente"), { target: { value: "client1" } });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service1" } });
    await selectEmployeeAndWaitForCalendar("employee1", dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "10:00" }));
    expect(within(dialog).getByRole("button", { name: "10:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.change(within(dialog).getByLabelText("Funcionário"), {
      target: { value: "employee2" },
    });

    await waitFor(() =>
      expect(within(dialog).queryByText("Horários disponíveis")).not.toBeInTheDocument(),
    );
    expect(availabilityApi.getEmployeeAvailabilities).toHaveBeenLastCalledWith("employee2");

    fireEvent.click(within(dialog).getByRole("button", { name: /criar agendamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A data e hora do agendamento são obrigatórias.",
    );
    expect(appointmentsApi.createAppointment).not.toHaveBeenCalled();
  });

  it("keeps the form open on 409 and lets the user pick another slot", async () => {
    vi.mocked(appointmentsApi.createAppointment).mockRejectedValue(
      httpError(409, {
        message: "O funcionário já possui um agendamento neste horário.",
      }),
    );
    const onConflict = vi.fn();
    renderForm({ onConflict });

    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Cliente"), { target: { value: "client1" } });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service1" } });
    await selectEmployeeAndWaitForCalendar("employee1", dialog);

    fireEvent.click(within(dialog).getByRole("button", { name: "2026-09-15" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "10:00" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /criar agendamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O funcionário já possui um agendamento neste horário.",
    );
    expect(onConflict).toHaveBeenCalled();

    // Seleção preservada após o conflicto.
    expect(within(dialog).getByRole("button", { name: "2026-09-15" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getByRole("button", { name: "10:00" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(within(dialog).getByLabelText("Cliente")).toHaveValue("client1");

    // Trocar de slot e reenviar.
    vi.mocked(appointmentsApi.createAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento criado com sucesso.",
      data: makeAppointment({ id: "appt99" }),
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "10:30" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /criar agendamento/i }));

    await waitFor(() => expect(appointmentsApi.createAppointment).toHaveBeenCalledTimes(2));
    expect(vi.mocked(appointmentsApi.createAppointment).mock.calls[1][0].startAt).toBe(
      "2026-09-15T09:30:00.000Z",
    );
    await waitFor(() => expect(onConflict).toHaveBeenCalledTimes(1));
  });
});