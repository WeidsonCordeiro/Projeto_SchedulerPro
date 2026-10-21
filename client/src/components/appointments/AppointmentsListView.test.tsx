import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AppointmentsListView from "./AppointmentsListView";
import type { Appointment } from "../../types/appointment";
import type { AppointmentsListViewProps } from "./AppointmentsListView";

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: "2026-11-15T09:00:00.000Z",
    endAt: "2026-11-15T09:30:00.000Z",
    status: "scheduled",
    notes: "Primeira visita",
    createdAt: "2026-07-01T10:00:00.000Z",
    updatedAt: "2026-07-01T10:00:00.000Z",
    ...overrides,
  };
}

const clientNames = new Map([["client1", "Maria Silva"]]);
const serviceNames = new Map([["service1", "Corte de cabelo"]]);
const employeeNames = new Map([["employee1", "Ana Lima"]]);

function renderList(overrides: Partial<AppointmentsListViewProps> = {}) {
  const onCreate = vi.fn();
  const onViewDetails = vi.fn();
  const onEdit = vi.fn();
  const onStatusAction = vi.fn();
  const onDeleteRequest = vi.fn();
  const onRetry = vi.fn();

  const props: AppointmentsListViewProps = {
    isLoading: false,
    loadError: null,
    onRetry,
    appointments: [makeAppointment()],
    timezone: "Europe/Lisbon",
    clientNames,
    serviceNames,
    employeeNames,
    canCreate: true,
    canUpdate: true,
    canStatus: true,
    canDelete: true,
    pendingStatusAction: null,
    onCreate,
    onViewDetails,
    onEdit,
    onStatusAction,
    onDeleteRequest,
    ...overrides,
  };

  const view = render(<AppointmentsListView {...props} />);
  return {
    ...view,
    onCreate,
    onViewDetails,
    onEdit,
    onStatusAction,
    onDeleteRequest,
    onRetry,
  };
}

describe("AppointmentsListView", () => {
  it("shows a loading state while data is loading", () => {
    renderList({ isLoading: true, appointments: [] });

    expect(screen.getByRole("status")).toHaveTextContent(/carregar agendamentos/i);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("shows an error state with retry", () => {
    const { onRetry } = renderList({
      loadError: "Falha ao carregar",
      appointments: [],
    });

    expect(screen.getByText("Falha ao carregar")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("shows the empty state with create action when allowed", () => {
    const { onCreate } = renderList({ appointments: [], canCreate: true });

    expect(screen.getByText("Nenhum agendamento encontrado")).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /cadastrar primeiro agendamento/i }),
    );
    expect(onCreate).toHaveBeenCalled();
  });

  it("shows the empty state without create when not allowed", () => {
    renderList({ appointments: [], canCreate: false });

    expect(screen.getByText("Nenhum agendamento encontrado")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /cadastrar primeiro agendamento/i }),
    ).not.toBeInTheDocument();
  });

  it("renders table headers and formatted row data", async () => {
    renderList();

    const table = screen.getByRole("table");
    expect(table.closest(".table-card")).not.toBeNull();
    expect(within(table).getByRole("columnheader", { name: "Data" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Status" })).toBeInTheDocument();
    expect(within(table).getByText("15/11/2026")).toBeInTheDocument();
    expect(within(table).getByText("09:00")).toBeInTheDocument();
    expect(within(table).getByText("até 09:30")).toBeInTheDocument();
    expect(within(table).getByText("Maria Silva")).toBeInTheDocument();
    expect(within(table).getByText("Corte de cabelo")).toBeInTheDocument();
    expect(within(table).getByText("Ana Lima")).toBeInTheDocument();
    expect(within(table).getByText("Primeira visita")).toBeInTheDocument();
    expect(within(table).getByText("Agendado")).toBeInTheDocument();
  });

  it("invokes edit, status and delete callbacks from the action row", () => {
    const { onEdit, onStatusAction, onDeleteRequest } = renderList();

    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: "appt1" }));

    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect(onStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "appt1" }),
      "confirm",
    );

    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onDeleteRequest).toHaveBeenCalledWith(expect.objectContaining({ id: "appt1" }));
  });

  it("shows Visualizar instead of Editar for past appointments", () => {
    const { onViewDetails } = renderList({
      appointments: [
        makeAppointment({
          startAt: "2026-07-15T09:00:00.000Z",
          endAt: "2026-07-15T09:30:00.000Z",
        }),
      ],
    });

    expect(screen.getByRole("button", { name: "Visualizar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Visualizar" }));
    expect(onViewDetails).toHaveBeenCalled();
  });

  it("hides the actions column when no action permissions are granted", () => {
    renderList({
      canUpdate: false,
      canStatus: false,
      canDelete: false,
    });

    const table = screen.getByRole("table");
    expect(within(table).queryByRole("columnheader", { name: "Ações" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
  });

  it("disables action buttons and shows Aguarde for the pending status action", () => {
    renderList({
      pendingStatusAction: { id: "appt1", action: "confirm" },
    });

    expect(screen.getByRole("button", { name: "Aguarde..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Editar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Excluir" })).toBeDisabled();
  });
});
