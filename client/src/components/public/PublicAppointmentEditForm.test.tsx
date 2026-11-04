import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PublicAppointmentEditForm from "./PublicAppointmentEditForm";

type FormProps = Parameters<typeof PublicAppointmentEditForm>[0];

function renderForm(
  overrides: Partial<Pick<FormProps, "isSaving" | "errorMessage">> = {},
) {
  const onSave = vi.fn();
  const onCancel = vi.fn();

  render(
    <PublicAppointmentEditForm
      isSaving={false}
      errorMessage={null}
      onSave={onSave}
      onCancel={onCancel}
      {...overrides}
    />,
  );

  return { onSave, onCancel };
}

describe("PublicAppointmentEditForm", () => {
  it("labels the only field it can safely expose", () => {
    renderForm();

    const field = screen.getByLabelText(/observações/i);
    expect(field).toBeInstanceOf(HTMLTextAreaElement);
    expect(field).toHaveAttribute("maxlength", "500");
  });

  it("does not expose the fields the public contract cannot offer", () => {
    renderForm();

    expect(screen.queryByLabelText(/serviço/i)).toBeNull();
    expect(screen.queryByLabelText(/profissional/i)).toBeNull();
    expect(screen.queryByLabelText(/data/i)).toBeNull();
    expect(screen.queryByLabelText(/hora/i)).toBeNull();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/preço/i)).toBeNull();
    expect(screen.queryByLabelText(/estado|status/i)).toBeNull();
  });

  it("keeps the submit disabled until something actually changes", () => {
    renderForm();

    const submit = screen.getByRole("button", { name: /guardar alterações/i });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: "Chego dez minutos depois" },
    });

    expect(submit).toBeEnabled();
  });

  it("sends only the notes, trimmed", () => {
    const { onSave } = renderForm();

    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: "  Chego dez minutos depois  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar alterações/i }));

    expect(onSave).toHaveBeenCalledWith({ notes: "Chego dez minutos depois" });
  });

  it("sends null when the notes are cleared", () => {
    const { onSave } = renderForm();
    const field = screen.getByLabelText(/observações/i);

    fireEvent.change(field, { target: { value: "Primeira anotação" } });
    fireEvent.change(field, { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /guardar alterações/i }));

    expect(onSave).toHaveBeenCalledWith({ notes: null });
  });

  it("never sends a payload wider than the public contract", () => {
    const { onSave } = renderForm();

    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: "Primeira vez aqui" },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar alterações/i }));

    expect(Object.keys(onSave.mock.calls[0][0])).toEqual(["notes"]);
  });

  it("blocks notes longer than the backend accepts and keeps them on screen", () => {
    const { onSave } = renderForm();

    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: "a".repeat(501) },
    });
    fireEvent.click(screen.getByRole("button", { name: /guardar alterações/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText(/no máximo 500 caracteres/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toHaveValue("a".repeat(501));
  });

  it("shows how many characters are left", () => {
    renderForm();

    expect(screen.getByText("500 caracteres restantes.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: "12345" },
    });

    expect(screen.getByText("495 caracteres restantes.")).toBeInTheDocument();
  });

  it("disables the controls and reports progress while saving", () => {
    renderForm({ isSaving: true });

    expect(screen.getByLabelText(/observações/i)).toBeDisabled();
    expect(screen.getByRole("button", { name: /a guardar/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /voltar/i })).toBeDisabled();
  });

  it("shows the error returned by the backend without losing the text", () => {
    renderForm({ errorMessage: "Este agendamento já não pode ser alterado." });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Este agendamento já não pode ser alterado.",
    );
  });

  it("returns to the summary without saving", () => {
    const { onCancel, onSave } = renderForm();

    fireEvent.change(screen.getByLabelText(/observações/i), {
      target: { value: "Teste" },
    });
    fireEvent.click(screen.getByRole("button", { name: /voltar/i }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("explains why the other fields cannot be changed from this link", () => {
    renderForm();

    expect(screen.getByText(/só as observações podem ser alteradas/i)).toBeInTheDocument();
  });

  it("renders the form as a landmark with an accessible name", () => {
    renderForm();

    expect(
      screen.getByRole("form", { name: /alterar agendamento/i }),
    ).toBeInTheDocument();
  });
});