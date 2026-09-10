import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppointmentForm from "./AppointmentForm";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { httpError } from "../../test/http";
import type { Appointment } from "../../types/appointment";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee } from "../../types/employee";

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: {
    createAppointment: vi.fn(),
    updateAppointment: vi.fn(),
  },
}));

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: "2026-07-15T09:00:00.000Z",
    endAt: "2026-07-15T09:30:00.000Z",
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

const clients = [makeClient()];
const services = [makeService()];
const employees = [makeEmployee()];

function renderForm(props: Partial<React.ComponentProps<typeof AppointmentForm>> = {}) {
  const propsBase = {
    isOpen: true,
    appointment: null,
    clients,
    services,
    employees,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...props,
  };
  render(<AppointmentForm {...propsBase} />);
}

function getDialog() {
  return screen.getByRole("dialog");
}

describe("AppointmentForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  it("keeps a now-inactive client/service visible when editing an appointment", () => {
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

    expect(
      screen.getByRole("option", { name: "Cliente Inativo (inativo)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Serviço Inativo (inativo)" }),
    ).toBeInTheDocument();
  });

  it("creates an appointment converting local time to UTC without companyId", async () => {
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
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), { target: { value: "employee1" } });
    fireEvent.change(within(dialog).getByLabelText("Data e hora"), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.change(within(dialog).getByLabelText("Observações"), {
      target: { value: "Primeira visita" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /criar agendamento/i }));

    expect(appointmentsApi.createAppointment).toHaveBeenCalledWith({
      clientId: "client1",
      serviceId: "service1",
      employeeId: "employee1",
      startAt: "2026-07-15T09:00:00.000Z",
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

  it("edits an appointment with pre-filled values and an end-time preview", async () => {
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
    expect(within(dialog).getByLabelText("Data e hora")).toHaveValue("2026-07-15T10:00");
    expect(within(dialog).getByLabelText("Observações")).toHaveValue("preferia de manhã");
    expect(screen.getByText(/termina às 10:30/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /salvar/i }));

    expect(appointmentsApi.updateAppointment).toHaveBeenCalledWith("appt1", {
      clientId: "client1",
      serviceId: "service2",
      employeeId: "employee1",
      startAt: "2026-07-15T09:00:00.000Z",
      notes: "preferia de manhã",
    });
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(updated));
  });

  it("keeps the form open and shows a 409 conflict error without losing data", async () => {
    vi.mocked(appointmentsApi.createAppointment).mockRejectedValue(
      httpError(409, {
        message: "O funcionário já possui um agendamento neste horário.",
      }),
    );
    renderForm();

    const dialog = getDialog();
    fireEvent.change(within(dialog).getByLabelText("Cliente"), { target: { value: "client1" } });
    fireEvent.change(within(dialog).getByLabelText("Serviço"), { target: { value: "service1" } });
    fireEvent.change(within(dialog).getByLabelText("Funcionário"), { target: { value: "employee1" } });
    fireEvent.change(within(dialog).getByLabelText("Data e hora"), {
      target: { value: "2026-07-15T10:00" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /criar agendamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "O funcionário já possui um agendamento neste horário.",
    );
    expect(within(screen.getByRole("dialog")).getByLabelText("Cliente")).toHaveValue("client1");
    expect(within(screen.getByRole("dialog")).getByLabelText("Funcionário")).toHaveValue(
      "employee1",
    );
    expect(within(screen.getByRole("dialog")).getByLabelText("Data e hora")).toHaveValue(
      "2026-07-15T10:00",
    );
    expect(screen.queryByText("Agendamento criado com sucesso.")).not.toBeInTheDocument();
  });
});