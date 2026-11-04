import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import DestructiveConfirmModal from "./DestructiveConfirmModal";

function renderShell(
  overrides: Partial<React.ComponentProps<typeof DestructiveConfirmModal>> = {},
) {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  render(
    <DestructiveConfirmModal
      isOpen
      title="Confirmar exclusão"
      onClose={onClose}
      onConfirm={onConfirm}
      isSubmitting={false}
      confirmLabel="Excluir"
      submittingLabel="Excluindo..."
      {...overrides}
    >
      <p>Corpo do modal</p>
    </DestructiveConfirmModal>,
  );
  return { onClose, onConfirm };
}

describe("DestructiveConfirmModal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <DestructiveConfirmModal
        isOpen={false}
        title="T"
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        isSubmitting={false}
        confirmLabel="Ok"
        submittingLabel="..."
      >
        <p>x</p>
      </DestructiveConfirmModal>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("calls onClose on cancel without confirming", () => {
    const { onClose, onConfirm } = renderShell();
    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("calls onConfirm when the destructive action is clicked", () => {
    const { onConfirm } = renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("disables actions and shows submitting label while submitting", () => {
    renderShell({ isSubmitting: true });
    expect(screen.getByRole("button", { name: /excluindo/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("shows inline errors", () => {
    renderShell({ errorMessage: "Falha ao excluir." });
    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao excluir.");
  });

  it("closes on Escape when closeOnEscape is enabled", () => {
    const { onClose } = renderShell({ closeOnEscape: true });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not close on Escape while submitting", () => {
    const { onClose } = renderShell({
      closeOnEscape: true,
      isSubmitting: true,
    });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("focuses the cancel button on open when requested", () => {
    renderShell({
      focusCancelOnOpen: true,
      cancelLabel: "Manter",
    });
    expect(screen.getByRole("button", { name: /manter/i })).toHaveFocus();
  });
});
