import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BookingDateTimePicker from "./BookingDateTimePicker";
import type { PublicAvailabilitySlot } from "../../../types/publicBooking";

const slots: PublicAvailabilitySlot[] = [
  { startAt: "2026-10-08T09:00:00.000+01:00", endAt: "2026-10-08T09:45:00.000+01:00" },
  { startAt: "2026-10-08T14:30:00.000+01:00", endAt: "2026-10-08T15:15:00.000+01:00" },
];

const baseProps = {
  date: "2026-10-08",
  onDateChange: vi.fn(),
  minDate: "2026-10-08",
  timezone: "Europe/Lisbon" as string | null,
  slots,
  selectedSlot: null,
  isLoading: false,
  errorMessage: null,
  onRetry: vi.fn(),
  onSelectSlot: vi.fn(),
};

describe("BookingDateTimePicker", () => {
  it("shows every slot the API returned, in the company timezone", () => {
    render(<BookingDateTimePicker {...baseProps} />);

    // 09:00+01:00 e 14:30+01:00 são as horas que a empresa vai ver.
    expect(screen.getByRole("button", { name: "09:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "14:30" })).toBeInTheDocument();
  });

  it("never computes slots locally; it renders exactly what it was given", () => {
    render(<BookingDateTimePicker {...baseProps} />);

    expect(screen.getAllByRole("button")).toHaveLength(slots.length);
  });

  it("reports the whole slot object, not the formatted hour", () => {
    const onSelectSlot = vi.fn();
    render(<BookingDateTimePicker {...baseProps} onSelectSlot={onSelectSlot} />);

    fireEvent.click(screen.getByRole("button", { name: "14:30" }));

    // O instante com deslocamento é o que vai para o POST; enviar "14:30"
    // perderia a data e o fuso.
    expect(onSelectSlot).toHaveBeenCalledWith(slots[1]);
  });

  it("marks the selected slot as pressed", () => {
    render(<BookingDateTimePicker {...baseProps} selectedSlot={slots[1]} />);

    expect(screen.getByRole("button", { name: "14:30" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("tells the user which timezone the hours are in", () => {
    render(<BookingDateTimePicker {...baseProps} />);

    expect(screen.getByText(/Europe\/Lisbon/)).toBeInTheDocument();
  });

  it("describes the date input with the timezone hint", () => {
    render(<BookingDateTimePicker {...baseProps} />);

    expect(screen.getByLabelText("Data")).toHaveAccessibleDescription(
      /Europe\/Lisbon/,
    );
  });

  it("drops the description when the API gives no timezone", () => {
    // Sem timezone não há texto de ajuda, logo o input não pode continuar a
    // apontar para um id que não existe.
    render(<BookingDateTimePicker {...baseProps} timezone={null} />);

    const input = screen.getByLabelText("Data");
    expect(input).not.toHaveAttribute("aria-describedby");
  });

  it("shows a loading state instead of an empty grid while fetching", () => {
    render(<BookingDateTimePicker {...baseProps} isLoading slots={[]} />);

    expect(screen.getByRole("status")).toHaveTextContent(/A consultar horários/);
    expect(
      screen.queryByText("Não existem horários disponíveis para esta data. Escolha outra data."),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when the API returns no slots", () => {
    render(<BookingDateTimePicker {...baseProps} slots={[]} />);

    expect(
      screen.getByText("Não existem horários disponíveis para esta data. Escolha outra data."),
    ).toBeInTheDocument();
  });

  it("shows an error with a retry action", () => {
    const onRetry = vi.fn();
    render(
      <BookingDateTimePicker
        {...baseProps}
        slots={[]}
        errorMessage="Falhou a consulta."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Falhou a consulta.");
    fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show the empty state while an error is displayed", () => {
    render(
      <BookingDateTimePicker
        {...baseProps}
        slots={[]}
        errorMessage="Falhou a consulta."
      />,
    );

    expect(screen.queryByText(/Escolha outra data/)).not.toBeInTheDocument();
  });

  it("reports the chosen date as a plain YYYY-MM-DD calendar key", () => {
    const onDateChange = vi.fn();
    render(<BookingDateTimePicker {...baseProps} onDateChange={onDateChange} />);

    fireEvent.change(screen.getByLabelText("Data"), {
      target: { value: "2026-10-15" },
    });

    // Nem um instante ISO nem um Date: o backend compara dias de calendário.
    expect(onDateChange).toHaveBeenCalledWith("2026-10-15");
  });

  it("blocks past dates with the min attribute", () => {
    render(<BookingDateTimePicker {...baseProps} minDate="2026-10-08" />);

    expect(screen.getByLabelText("Data")).toHaveAttribute("min", "2026-10-08");
  });

  it("counts the slots so the user knows the size of the choice", () => {
    render(<BookingDateTimePicker {...baseProps} />);

    expect(screen.getByText("2 horários disponíveis")).toBeInTheDocument();
  });
});