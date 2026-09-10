import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AvailableTimeSlots from "./AvailableTimeSlots";
import type { AvailableSlot } from "../../config/appointmentSlots";

function makeSlot(overrides: Partial<AvailableSlot> = {}): AvailableSlot {
  return {
    start: "2026-09-15T09:00:00.000Z",
    end: "2026-09-15T09:30:00.000Z",
    localTime: "10:00",
    ...overrides,
  };
}

const slots = [
  makeSlot(),
  makeSlot({ start: "2026-09-15T09:30:00.000Z", end: "2026-09-15T10:00:00.000Z", localTime: "10:30" }),
];

describe("AvailableTimeSlots", () => {
  it("renders one button per slot with the local time", () => {
    render(
      <AvailableTimeSlots slots={slots} selectedStart={null} onSelect={() => {}} />,
    );

    expect(screen.getByRole("button", { name: "10:00" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "10:30" })).toBeInTheDocument();
  });

  it("marks the selected slot as pressed", () => {
    render(
      <AvailableTimeSlots
        slots={slots}
        selectedStart="2026-09-15T09:30:00.000Z"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: "10:30" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "10:00" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("calls onSelect with the slot start instant", () => {
    const onSelect = vi.fn();
    render(<AvailableTimeSlots slots={slots} selectedStart={null} onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("button", { name: "10:00" }));

    expect(onSelect).toHaveBeenCalledWith("2026-09-15T09:00:00.000Z");
  });

  it("shows the empty state when there are no slots", () => {
    render(<AvailableTimeSlots slots={[]} selectedStart={null} onSelect={() => {}} />);

    expect(screen.getByText("Não há horários disponíveis nesta data.")).toBeInTheDocument();
  });

  it("keeps the current appointment slot visible during edit", () => {
    render(
      <AvailableTimeSlots
        slots={[]}
        selectedStart={null}
        onSelect={() => {}}
        currentLabel="10:00 (horário atual do agendamento)"
      />,
    );

    expect(
      screen.getByRole("button", { name: "10:00 (horário atual do agendamento)" }),
    ).toBeDisabled();
    expect(
      screen.getByText(/demais horários desta data já estão ocupados/i),
    ).toBeInTheDocument();
  });
});