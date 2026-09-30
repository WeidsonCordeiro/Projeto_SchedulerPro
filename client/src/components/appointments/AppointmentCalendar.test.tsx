import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import AppointmentCalendar from "./AppointmentCalendar";
import type { Availability } from "../../types/availability";

/**
 * Fixa o relógio em 2026-09-10 para tornar "hoje" determinístico. Apenas a
 * fonte "Date" é fakeada; timers/React seguem reais.
 */
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function makeAvailability(overrides: Partial<Availability> = {}): Availability {
  return {
    id: "av1",
    companyId: "company1",
    employeeId: "employee1",
    dayOfWeek: 1,
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: "14:00",
    afternoonEnd: "18:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function weekdays() {
  return [1, 2, 3, 4, 5].map((dayOfWeek) =>
    makeAvailability({
      id: `av-${dayOfWeek}`,
      dayOfWeek: dayOfWeek as Availability["dayOfWeek"],
    }),
  );
}

const WEEKDAY = "2026-09-14"; // segunda-feira
const WEEKEND = "2026-09-12"; // sábado
const ADJACENT = "2026-08-31"; // dia do mês anterior na grade

describe("AppointmentCalendar", () => {
  it("shows the current month header in Portuguese", () => {
    render(
      <AppointmentCalendar availability={weekdays()} selectedDate={null} onSelectDay={() => {}} />,
    );

    expect(screen.getByText("Setembro 2026")).toBeInTheDocument();
  });

  it("renders the Monday-first weekday header", () => {
    render(
      <AppointmentCalendar availability={weekdays()} selectedDate={null} onSelectDay={() => {}} />,
    );

    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.getByText("Dom")).toBeInTheDocument();
    expect(screen.getAllByRole("button").some((button) => button.textContent === "Seg")).toBe(false);
  });

  it("enables working days and disables days without availability", () => {
    render(
      <AppointmentCalendar availability={weekdays()} selectedDate={null} onSelectDay={() => {}} />,
    );

    expect(screen.getByRole("button", { name: WEEKDAY })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: WEEKEND })).toBeDisabled();
    expect(screen.getByRole("button", { name: ADJACENT })).toBeDisabled();
  });

  it("highlights the selected day", () => {
    render(
      <AppointmentCalendar
        availability={weekdays()}
        selectedDate={WEEKDAY}
        onSelectDay={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: WEEKDAY })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("calls onSelectDay with the local date key when a day is clicked", () => {
    const onSelectDay = vi.fn();
    render(
      <AppointmentCalendar
        availability={weekdays()}
        selectedDate={null}
        onSelectDay={onSelectDay}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: WEEKDAY }));

    expect(onSelectDay).toHaveBeenCalledWith(WEEKDAY);
  });

  it("navigates between months", () => {
    render(
      <AppointmentCalendar availability={weekdays()} selectedDate={null} onSelectDay={() => {}} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /mês anterior/i }));
    expect(screen.getByText("Agosto 2026")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /próximo mês/i }));
    expect(screen.getByText("Setembro 2026")).toBeInTheDocument();
  });

  it("disables navigation beyond the minimum month when editing an old appointment", () => {
    render(
      <AppointmentCalendar
        availability={weekdays()}
        selectedDate="2024-09-15"
        onSelectDay={() => {}}
      />,
    );

    // O bounds é expandido para abrir no mês do agendamento antigo.
    expect(screen.getByText("Setembro 2024")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /mês anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /próximo mês/i })).not.toBeDisabled();
  });

  it("disables navigation beyond the maximum month", () => {
    render(
      <AppointmentCalendar
        availability={weekdays()}
        selectedDate="2028-09-15"
        onSelectDay={() => {}}
      />,
    );

    // O bounds é expandido para abrir no mês do agendamento futuro.
    expect(screen.getByText("Setembro 2028")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /próximo mês/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /mês anterior/i })).not.toBeDisabled();
  });

  it("shows the availability legend", () => {
    render(
      <AppointmentCalendar availability={weekdays()} selectedDate={null} onSelectDay={() => {}} />,
    );

    expect(screen.getByText("Disponível")).toBeInTheDocument();
    expect(screen.getByText("Sem expediente")).toBeInTheDocument();
  });
});