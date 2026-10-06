import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PublicAppointmentCancelDialog from "./PublicAppointmentCancelDialog";
import type { PublicAppointment } from "../../types/publicAppointment";

const appointment: PublicAppointment = {
  id: "apt1",
  companyId: "company1",
  startAt: "2026-10-10T14:30:00.000Z",
  endAt: "2026-10-10T15:00:00.000Z",
  timezone: "Europe/Lisbon",
  status: "scheduled",
  clientName: "Maria Silva",
  service: { id: "svc1", name: "Corte de cabelo" },
  employee: { id: "emp1", name: "João Silva", avatarUrl: null },
};

function renderDialog(
  overrides: Partial<Parameters<typeof PublicAppointmentCancelDialog>[0]> = {},
) {
  const props = {
    isOpen: true,
    appointment,
    isCancelling: false,
    errorMessage: null,
    onConfirm: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };

  render(<PublicAppointmentCancelDialog {...props} />);

  return props;
}

describe("PublicAppointmentCancelDialog", () => {
  it("renders nothing while closed", () => {
    renderDialog({ isOpen: false });

    expect(
      screen.queryByRole("dialog", { name: /cancelar agendamento/i }),
    ).toBeNull();
  });

  it("asks for confirmation and repeats what is about to be cancelled", () => {
    renderDialog();

    expect(
      screen.getByText(/tem certeza de que deseja cancelar este agendamento/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("10/10/2026")).toBeInTheDocument();
    expect(screen.getByText("15:30 – 16:00")).toBeInTheDocument();
  });

  it("is an accessible modal", () => {
    renderDialog();

    const dialog = screen.getByRole("dialog", { name: /cancelar agendamento/i });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(
      screen.getByRole("button", { name: /fechar/i }),
    ).toBeInTheDocument();
  });

  it("does not cancel anything merely by being opened", () => {
    const { onConfirm } = renderDialog();

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledTimes(0);
  });

  it("cancels only after an explicit confirmation", () => {
    const { onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /sim, cancelar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("closes without cancelling when the person changes their mind", () => {
    const { onClose, onConfirm } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /manter agendamento/i }));

    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("closes with the accessible close button", () => {
    const { onClose } = renderDialog();

    fireEvent.click(screen.getByRole("button", { name: /fechar/i }));

    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape while nothing is in flight", () => {
    const { onClose } = renderDialog();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalled();
  });

  it("ignores Escape once the cancellation was sent", () => {
    const { onClose } = renderDialog({ isCancelling: true });

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses the safe option instead of the destructive one", () => {
    renderDialog();

    expect(
      screen.getByRole("button", { name: /manter agendamento/i }),
    ).toHaveFocus();
  });

  it("locks the buttons and reports progress while cancelling", () => {
    renderDialog({ isCancelling: true });

    expect(screen.getByRole("button", { name: /a cancelar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /manter agendamento/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fechar/i })).toBeDisabled();
  });

  it("shows the failure without closing the dialog", () => {
    const { onConfirm } = renderDialog({
      errorMessage: "Demasiadas tentativas. Aguarde alguns minutos.",
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Demasiadas tentativas. Aguarde alguns minutos.",
    );
    expect(
      screen.getByRole("dialog", { name: /cancelar agendamento/i }),
    ).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
