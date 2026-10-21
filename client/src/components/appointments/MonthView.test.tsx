import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import MonthView from "./MonthView";
import companyReducer from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";

function makeStore(timezone = "Europe/Lisbon") {
  return configureStore({
    reducer: { company: companyReducer },
    preloadedState: {
      company: {
        company: {
          id: "company1",
          name: "salao do centro",
          timezone,
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
  });
}

function renderWithStore(ui: React.ReactElement, timezone = "Europe/Lisbon") {
  return render(<Provider store={makeStore(timezone)}>{ui}</Provider>);
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: "appt1",
    companyId: "company1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "employee1",
    startAt: "2026-09-10T09:00:00.000Z",
    endAt: "2026-09-10T09:30:00.000Z",
    status: "scheduled",
    notes: null,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

const names = new Map<string, string>([
  ["client1", "Maria Silva"],
  ["service1", "Corte de cabelo"],
]);

const noopOnDayClick = vi.fn();
const noopOnMonthDaySelect = vi.fn();
const noopOnAppointmentClick = vi.fn();

function makeBusyDayAppointments(count: number, dateKey = "2026-09-15"): Appointment[] {
  return Array.from({ length: count }, (_, i) => {
    const start = `${dateKey}T${String(8 + i).padStart(2, "0")}:00:00.000Z`;
    const end = `${dateKey}T${String(9 + i).padStart(2, "0")}:00:00.000Z`;
    return makeAppointment({ id: `busy${i}`, startAt: start, endAt: end });
  });
}

function defaultMonthViewProps(
  overrides: Partial<React.ComponentProps<typeof MonthView>> = {},
): React.ComponentProps<typeof MonthView> {
  return {
    appointments: [],
    clientNames: names,
    serviceNames: names,
    currentDateKey: "2026-09-10",
    onDayClick: noopOnDayClick,
    onAppointmentClick: noopOnAppointmentClick,
    todayKey: "2026-09-10",
    isMobileViewport: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MonthView - composição", () => {
  it("renders the month grid on desktop without the day agenda list", () => {
    renderWithStore(
      <MonthView
        {...defaultMonthViewProps({
          appointments: [makeAppointment()],
          isMobileViewport: false,
        })}
      />,
    );

    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /terça-feira/i })).not.toBeInTheDocument();
  });

  it("renders MonthDayAgendaList below the grid on mobile when todayKey is set", () => {
    renderWithStore(
      <MonthView
        {...defaultMonthViewProps({
          appointments: makeBusyDayAppointments(5),
          monthFocusedDateKey: "2026-09-15",
          onMonthDaySelect: noopOnMonthDaySelect,
          isMobileViewport: true,
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: /terça-feira, 15 de setembro/i })).toBeInTheDocument();
    expect(screen.getAllByTitle(/Maria Silva/)).toHaveLength(5);
  });
});

describe("MonthView - seleção mobile", () => {
  it("calls onMonthDaySelect instead of onDayClick when a day cell is activated", () => {
    const onDayClick = vi.fn();
    const onMonthDaySelect = vi.fn();
    const { container } = renderWithStore(
      <MonthView
        {...defaultMonthViewProps({
          onDayClick,
          onMonthDaySelect,
          isMobileViewport: true,
        })}
      />,
    );

    const sep15Cell = Array.from(container.querySelectorAll(".calendar-day-cell")).find(
      (cell) =>
        cell.querySelector(".calendar-day-number")?.textContent === "15" &&
        !cell.classList.contains("bg-light"),
    );
    fireEvent.click(sep15Cell!);
    expect(onMonthDaySelect).toHaveBeenCalledWith("2026-09-15");
    expect(onDayClick).not.toHaveBeenCalled();
  });
});

describe("MonthView - overflow", () => {
  it("forwards overflow clicks to onOverflowDayClick on desktop", () => {
    const onOverflowDayClick = vi.fn();
    renderWithStore(
      <MonthView
        {...defaultMonthViewProps({
          appointments: makeBusyDayAppointments(5),
          onOverflowDayClick,
          isMobileViewport: false,
        })}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: /ver todas as marcações de terça-feira, 15 de setembro/i,
      }),
    );
    expect(onOverflowDayClick).toHaveBeenCalledWith("2026-09-15");
  });

  describe("mobile", () => {
    beforeEach(() => {
      HTMLElement.prototype.scrollIntoView = vi.fn();
    });

    afterEach(() => {
      delete (HTMLElement.prototype as { scrollIntoView?: () => void }).scrollIntoView;
    });

    it("routes overflow to onMonthDaySelect instead of onOverflowDayClick", async () => {
      const onOverflowDayClick = vi.fn();
      const onMonthDaySelect = vi.fn();
      renderWithStore(
        <MonthView
          {...defaultMonthViewProps({
            appointments: makeBusyDayAppointments(5),
            onOverflowDayClick,
            onMonthDaySelect,
            monthFocusedDateKey: "2026-09-10",
            isMobileViewport: true,
          })}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", {
          name: /ver todas as marcações de terça-feira, 15 de setembro/i,
        }),
      );
      expect(onMonthDaySelect).toHaveBeenCalledWith("2026-09-15");
      expect(onOverflowDayClick).not.toHaveBeenCalled();
      await new Promise<void>((resolve) => {
        queueMicrotask(() => resolve());
      });
      expect(HTMLElement.prototype.scrollIntoView).toHaveBeenCalled();
    });
  });
});

describe("MonthView - datas passadas", () => {
  it("does not trigger onDayClick when a past day cell is activated", () => {
    const onDayClick = vi.fn();
    renderWithStore(
      <MonthView
        {...defaultMonthViewProps({
          onDayClick,
          isMobileViewport: false,
        })}
      />,
    );

    const pastCell = screen.getAllByRole("button", { name: "5" })[0];
    expect(pastCell).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(pastCell);
    expect(onDayClick).not.toHaveBeenCalled();
  });
});
