import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingReview from "./BookingReview";
import type { ClientDetailsInput } from "../../../config/publicBooking";

const service = {
  id: "svc1",
  name: "Corte de cabelo",
  description: null,
  durationMinutes: 45,
  price: 25,
};

const employee = { id: "emp1", name: "João Silva", avatarUrl: null };

const slot = {
  startAt: "2026-10-08T09:00:00.000+01:00",
  endAt: "2026-10-08T09:45:00.000+01:00",
};

const details: ClientDetailsInput = {
  clientName: "Maria Silva",
  clientEmail: "maria@example.com",
  clientPhone: "",
  notes: "",
};

const baseProps = {
  service,
  employee,
  slot,
  timezone: "Europe/Lisbon",
  details,
  isSubmitting: false,
  submitError: null,
  onConfirm: vi.fn(),
  onBack: vi.fn(),
};

describe("BookingReview", () => {
  it("summarises the choice before it is committed", () => {
    render(<BookingReview {...baseProps} />);

    expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    // Duração e preço vão na mesma linha secundária.
    expect(screen.getByText(/45 min/)).toHaveTextContent("25,00");
    expect(screen.getByText("Quinta-feira, 8 de outubro de 2026")).toBeInTheDocument();
    expect(screen.getByText("às 09:00")).toBeInTheDocument();
    expect(screen.getByText("maria@example.com")).toBeInTheDocument();
  });

  it("pairs labels with values in a definition list", () => {
    const { container } = render(<BookingReview {...baseProps} />);
    const list = container.querySelector("dl");

    const labels = Array.from(list!.querySelectorAll("dt")).map(
      (node) => node.textContent,
    );

    expect(labels).toEqual([
      "Serviço",
      "Profissional",
      "Data e hora",
      "Nome",
      "E-mail",
    ]);
    expect(list!.querySelectorAll("dd")).toHaveLength(labels.length);
  });

  it("omits the optional rows the user left empty", () => {
    const { container } = render(<BookingReview {...baseProps} />);
    const labels = Array.from(container.querySelectorAll("dt")).map(
      (node) => node.textContent,
    );

    expect(labels).not.toContain("Telefone");
    expect(labels).not.toContain("Observações");
  });

  it("shows the optional rows once they have content", () => {
    render(
      <BookingReview
        {...baseProps}
        details={{
          ...details,
          clientPhone: "912345678",
          notes: "Primeira vez",
        }}
      />,
    );

    expect(screen.getByText("912345678")).toBeInTheDocument();
    expect(screen.getByText("Primeira vez")).toBeInTheDocument();
  });

  it("confirms on click", () => {
    const onConfirm = vi.fn();
    render(<BookingReview {...baseProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("locks both buttons while the request is in flight", () => {
    const onConfirm = vi.fn();
    render(
      <BookingReview
        {...baseProps}
        isSubmitting
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByRole("button", { name: /A confirmar/ });
    expect(confirm).toBeDisabled();
    expect(screen.getByRole("button", { name: "Voltar" })).toBeDisabled();

    // Um segundo clique não pode disparar um segundo agendamento.
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("shows a submit failure next to the confirm button", () => {
    render(
      <BookingReview
        {...baseProps}
        submitError="Esse horário acabou de ser ocupado. Escolha outro horário disponível."
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Esse horário acabou de ser ocupado. Escolha outro horário disponível.",
    );
  });

  it("goes back to the details without confirming", () => {
    const onBack = vi.fn();
    const onConfirm = vi.fn();
    render(<BookingReview {...baseProps} onBack={onBack} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

    expect(onBack).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});