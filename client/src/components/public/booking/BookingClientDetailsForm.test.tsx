import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import BookingClientDetailsForm from "./BookingClientDetailsForm";
import type { ClientDetailsInput } from "../../../config/publicBooking";

const EMPTY: ClientDetailsInput = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  notes: "",
};

/**
 * Componente controlado, como na página real.
 *
 * Sem isto o `value` do input ficaria congelado e os testes de escrita não
 * provariam nada — o componente apareceria como "funcional" mesmo sem tratar
 * a alteração.
 */
function Harness({
  onSubmit = vi.fn(),
  onBack = vi.fn(),
}: {
  onSubmit?: () => void;
  onBack?: () => void;
}) {
  const [value, setValue] = useState<ClientDetailsInput>(EMPTY);
  return (
    <BookingClientDetailsForm
      value={value}
      onChange={setValue}
      onSubmit={onSubmit}
      onBack={onBack}
    />
  );
}

describe("BookingClientDetailsForm", () => {
  it("labels every field", () => {
    render(<Harness />);

    expect(screen.getByLabelText(/^Nome/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^E-mail/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Telefone/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Observações/)).toBeInTheDocument();
  });

  it("marks phone and notes as optional in their accessible name", () => {
    render(<Harness />);

    // O "(opcional)" vive no <label>, por isso entra no nome acessível do
    // input — é aí que um leitor de ecrã o encontra.
    expect(screen.getByLabelText(/Telefone \(opcional\)/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Observações \(opcional\)/)).toBeInTheDocument();
  });

  it("does not show an error before the field is touched", () => {
    render(<Harness />);

    // Um campo vazio não é um erro enquanto ninguém escreveu nada.
    expect(screen.queryByText("O nome é obrigatório.")).not.toBeInTheDocument();
  });

  it("validates on blur and shows the error on the field", () => {
    render(<Harness />);

    fireEvent.blur(screen.getByLabelText(/^Nome/));

    expect(screen.getByText("O nome é obrigatório.")).toBeInTheDocument();
  });

  it("clears the error as soon as the value becomes valid", () => {
    render(<Harness />);

    fireEvent.blur(screen.getByLabelText(/^E-mail/));
    expect(screen.getByText("O e-mail é obrigatório.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^E-mail/), {
      target: { value: "maria@example.com" },
    });

    expect(screen.queryByText("O e-mail é obrigatório.")).not.toBeInTheDocument();
  });

  it("rejects a malformed email", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/^E-mail/), {
      target: { value: "maria@" },
    });
    fireEvent.blur(screen.getByLabelText(/^E-mail/));

    expect(screen.getByText("O e-mail informado é inválido.")).toBeInTheDocument();
  });

  it("rejects a phone that is too short but allows an empty one", () => {
    render(<Harness />);

    fireEvent.change(screen.getByLabelText(/^Telefone/), {
      target: { value: "912" },
    });
    fireEvent.blur(screen.getByLabelText(/^Telefone/));
    expect(screen.getByText(/entre 8 e 20/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Telefone/), {
      target: { value: "" },
    });
    expect(screen.queryByText(/entre 8 e 20/)).not.toBeInTheDocument();
  });

  it("does not submit while the form is invalid", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("O nome é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("O e-mail é obrigatório.")).toBeInTheDocument();
  });

  it("keeps the submit button usable so the user can always find out why it fails", () => {
    render(<Harness />);

    // Desativar o botão deixaria o formulário sem forma de explicar o motivo.
    expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();
  });

  it("submits once name and email are valid, with the phone optional", () => {
    const onSubmit = vi.fn();
    render(<Harness onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/^Nome/), {
      target: { value: "Maria Silva" },
    });
    fireEvent.change(screen.getByLabelText(/^E-mail/), {
      target: { value: "maria@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("goes back without submitting", () => {
    const onSubmit = vi.fn();
    const onBack = vi.fn();
    render(<Harness onSubmit={onSubmit} onBack={onBack} />);

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("caps the fields at the same limits as the backend", () => {
    render(<Harness />);

    expect(screen.getByLabelText(/^Nome/)).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute("maxlength", "254");
    expect(screen.getByLabelText(/^Telefone/)).toHaveAttribute("maxlength", "20");
    expect(screen.getByLabelText(/^Observações/)).toHaveAttribute("maxlength", "500");
  });

  it("suggests autofill values, since the user is typing their own details", () => {
    render(<Harness />);

    expect(screen.getByLabelText(/^Nome/)).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText(/^E-mail/)).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText(/^Telefone/)).toHaveAttribute("autocomplete", "tel");
  });

  it("moves focus to the form when the step opens", () => {
    const { container } = render(<Harness />);

    expect(container.querySelector("form")).toHaveFocus();
  });
});