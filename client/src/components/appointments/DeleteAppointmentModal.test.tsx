import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteAppointmentModal from "./DeleteAppointmentModal";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { httpError } from "../../test/http";
import type { Appointment } from "../../types/appointment";

vi.mock("../../api/endpoints/appointments.api", () => ({
  default: {
    deleteAppointment: vi.fn(),
  },
}));

const appointment: Appointment = {
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
};

function renderModal(props: Partial<React.ComponentProps<typeof DeleteAppointmentModal>> = {}) {
  const propsBase = {
    isOpen: true,
    appointment,
    clientName: "Maria Silva",
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...props,
  };
  return render(<DeleteAppointmentModal {...propsBase} />);
}

describe("DeleteAppointmentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while closed or without an appointment", () => {
    const { unmount } = renderModal({ isOpen: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    unmount();
    renderModal({ appointment: null });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("asks for confirmation showing the client and local date/time", () => {
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Tem certeza que deseja excluir este agendamento?"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Maria Silva · 15/07/2026 · 10:00")).toBeInTheDocument();
  });

  it("deletes the appointment after confirmation", async () => {
    vi.mocked(appointmentsApi.deleteAppointment).mockResolvedValue({
      success: true,
      message: "Agendamento removido com sucesso.",
      data: null,
    });
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    renderModal({ onDeleted, onClose });

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(appointmentsApi.deleteAppointment).toHaveBeenCalledWith("appt1");
    await waitFor(() => {
      expect(onDeleted).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("does not delete when the user cancels", () => {
    const onClose = vi.fn();
    renderModal({ onClose });

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /cancelar/i }));

    expect(appointmentsApi.deleteAppointment).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows delete errors in the dialog", async () => {
    vi.mocked(appointmentsApi.deleteAppointment).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );
    const onClose = vi.fn();
    renderModal({ onClose });

    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(onClose).not.toHaveBeenCalled();
  });
});