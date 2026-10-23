import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import CalendarView from "./CalendarView";
import MonthCalendar from "./MonthCalendar";
import WeekCalendar from "./WeekCalendar";
import DayCalendar from "./DayCalendar";
import AppointmentsViewSwitcher from "./AppointmentsViewSwitcher";
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

function mockViewportMobile(mobile: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mobile,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
  mockViewportMobile(false);
});

afterEach(() => {
  vi.useRealTimers();
});

const noopViewChange = vi.fn();
const noopOnDayClick = vi.fn();
const noopOnOverflowClick = vi.fn();
const noopOnMonthDaySelect = vi.fn();
const noopOnSlotClick = vi.fn();
const noopOnAppointmentClick = vi.fn();

function makeBusyDayAppointments(count: number, dateKey = "2026-09-15"): Appointment[] {
  return Array.from({ length: count }, (_, i) => {
    const start = `${dateKey}T${String(8 + i).padStart(2, "0")}:00:00.000Z`;
    const end = `${dateKey}T${String(9 + i).padStart(2, "0")}:00:00.000Z`;
    return makeAppointment({ id: `busy${i}`, startAt: start, endAt: end });
  });
}

describe("CalendarView", () => {
  it("shows loading state without rendering the month grid", () => {
    renderWithStore(
      <CalendarView
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        viewType="month"
        currentDateKey="2026-09-10"
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={noopOnAppointmentClick}
        month={{ isMobileViewport: false }}
        isLoading
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/carregar agendamentos/i);
    expect(screen.queryByText("Seg")).not.toBeInTheDocument();
  });

  it("renders the month grid when viewType is month and data is ready", () => {
    renderWithStore(
      <CalendarView
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        viewType="month"
        currentDateKey="2026-09-10"
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={noopOnAppointmentClick}
        month={{ isMobileViewport: false }}
        todayKey="2026-09-10"
      />,
    );

    expect(screen.getByText("Seg")).toBeInTheDocument();
  });

  it("routes week block clicks to onTimeGridAppointmentClick with anchor", () => {
    const onTimeGridAppointmentClick = vi.fn();
    const onAppointmentClick = vi.fn();
    renderWithStore(
      <CalendarView
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        viewType="week"
        currentDateKey="2026-09-10"
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={onAppointmentClick}
        onTimeGridAppointmentClick={onTimeGridAppointmentClick}
      />,
    );

    fireEvent.click(screen.getByText("Maria Silva"));
    expect(onTimeGridAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "appt1" }),
      expect.any(HTMLElement),
    );
    expect(onAppointmentClick).not.toHaveBeenCalled();
  });
});

describe("MonthCalendar", () => {
  it("renders weekday headers and day cells", () => {
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.getByText("Dom")).toBeInTheDocument();
    // O agendamento aparece como item clicável (título com nome do cliente)
    const item = screen.getByTitle(/Maria Silva/);
    expect(item).toHaveAccessibleName(/Maria Silva.*Agendado/i);
    expect(item).toHaveTextContent("Agendado");
  });

  it("opens the edit callback when an appointment is clicked", () => {
    const onAppointmentClick = vi.fn();
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={onAppointmentClick}
      />,
    );

    fireEvent.click(screen.getByTitle(/Maria Silva/));
    expect(onAppointmentClick).toHaveBeenCalledWith(expect.objectContaining({ id: "appt1" }));
  });

  it("opening a future day cell triggers onDayClick", () => {
    const onDayClick = vi.fn();
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onDayClick={onDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        todayKey="2026-09-10"
      />,
    );

    // Sep 15 (future) → onDayClick fired
    fireEvent.click(screen.getByRole("button", { name: "15" }));
    expect(onDayClick).toHaveBeenCalledWith("2026-09-15");
  });

  it("a past day cell does not trigger onDayClick", () => {
    const onDayClick = vi.fn();
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onDayClick={onDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        todayKey="2026-09-10"
      />,
    );

    // Sep 5 (past) → onDayClick not called; the cell is aria-disabled.
    const pastCell = screen.getAllByRole("button", { name: "5" })[0]; // first "5" = Sep 5
    expect(pastCell).toHaveAttribute("aria-disabled", "true");
    fireEvent.click(pastCell);
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it("a past day cell still triggers onAppointmentClick", () => {
    const onAppointmentClick = vi.fn();
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[makeAppointment({ id: "a-past", startAt: "2026-09-05T09:00:00.000Z", endAt: "2026-09-05T09:30:00.000Z" })]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={onAppointmentClick}
        todayKey="2026-09-10"
      />,
    );

    // The appointment item button on a past day is still clickable.
    fireEvent.click(screen.getByTitle(/Maria Silva/));
    expect(onAppointmentClick).toHaveBeenCalled();
  });
});

describe("WeekCalendar", () => {
  it("renders appointment blocks with day headers", () => {
    renderWithStore(
      <WeekCalendar
        currentDateKey="2026-09-10"
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    expect(screen.getByText("Qui")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
    expect(screen.getByText("Agendado")).toBeInTheDocument();
  });

  it("passes anchor element to onAppointmentClick", () => {
    const onAppointmentClick = vi.fn();
    renderWithStore(
      <WeekCalendar
        currentDateKey="2026-09-10"
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onAppointmentClick={onAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    fireEvent.click(screen.getByText("Maria Silva"));
    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "appt1" }),
      expect.any(HTMLElement),
    );
  });

  it("calls onSlotClick with the date and hour", () => {
    const onSlotClick = vi.fn();
    renderWithStore(
      <WeekCalendar
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={onSlotClick}
      />,
    );

    // Célula vazia de uma coluna (role button) — clique dispara prefill
    const slots = screen.getAllByRole("button");
    fireEvent.click(slots[0]);
    expect(onSlotClick).toHaveBeenCalled();
  });
});

describe("DayCalendar", () => {
  it("renders the weekday header and appointment details", () => {
    renderWithStore(
      <DayCalendar
        currentDateKey="2026-09-10"
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    expect(screen.getByText(/quinta-feira/i)).toBeInTheDocument();
    expect(screen.getByText(/Maria Silva/)).toBeInTheDocument();
  });

  it("opens appointment edit callback", () => {
    const onAppointmentClick = vi.fn();
    renderWithStore(
      <DayCalendar
        currentDateKey="2026-09-10"
        appointments={[makeAppointment()]}
        clientNames={names}
        serviceNames={names}
        onAppointmentClick={onAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    fireEvent.click(screen.getByText(/Maria Silva/));
    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "appt1" }),
      expect.any(HTMLElement),
    );
  });

  it("calls onSlotClick for empty time slots", () => {
    const onSlotClick = vi.fn();
    renderWithStore(
      <DayCalendar
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={onSlotClick}
      />,
    );

    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onSlotClick).toHaveBeenCalledWith("2026-09-10", expect.any(Number));
  });

  it("places overlapping appointments side by side instead of stacking them", () => {
    const overlapping = [
      makeAppointment({ id: "appt1", startAt: "2026-09-10T09:00:00.000Z", endAt: "2026-09-10T10:00:00.000Z" }),
      makeAppointment({ id: "appt2", clientId: "client2", startAt: "2026-09-10T09:30:00.000Z", endAt: "2026-09-10T10:30:00.000Z" }),
    ];
    const multiNames = new Map<string, string>([
      ["client1", "Maria Silva"],
      ["client2", "João Costa"],
      ["service1", "Corte de cabelo"],
    ]);

    const { container } = renderWithStore(
      <DayCalendar
        currentDateKey="2026-09-10"
        appointments={overlapping}
        clientNames={multiNames}
        serviceNames={names}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    const blocks = Array.from(
      container.querySelectorAll<HTMLElement>(".calendar-week-event"),
    ).map((el) => el.closest<HTMLElement>('[role="button"]'));

    expect(blocks).toHaveLength(2);
    const [first, second] = blocks.map((block) => block?.style.left ?? "");
    expect(first).not.toBe(second);
    // A coluna calculada em computeDayLayout tem de ser respeitada.
    expect(blocks[0]?.style.width).toBe(blocks[1]?.style.width);
  });

  it("applies a status stripe per block while using service backgrounds", () => {
    const { container } = renderWithStore(
      <DayCalendar
        currentDateKey="2026-09-10"
        appointments={[
          makeAppointment({ id: "appt1", status: "scheduled" }),
          makeAppointment({ id: "appt2", clientId: "client2", status: "cancelled" }),
        ]}
        clientNames={new Map([["client1", "Maria Silva"], ["client2", "João Costa"]])}
        serviceNames={names}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    const classes = Array.from(container.querySelectorAll(".calendar-week-event")).map(
      (el) => el.className,
    );

    expect(classes.some((c) => c.includes("calendar-status-stripe--scheduled"))).toBe(
      true,
    );
    expect(classes.some((c) => c.includes("calendar-status-stripe--cancelled"))).toBe(
      true,
    );
  });
});

describe("WeekCalendar - destaque de hoje", () => {
  it("marks today's column even when the todayKey prop is not provided", () => {
    // Sem a prop, a data corrente é calculada internamente. A coluna de hoje
    // não pode depender de o componente pai fornecer a prop.
    const { container } = renderWithStore(
      <WeekCalendar
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    expect(container.querySelectorAll(".bg-primary-subtle").length).toBeGreaterThan(0);
  });

  it("renders the now line on today's column in week view", () => {
    const { container } = renderWithStore(
      <WeekCalendar
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
        todayKey="2026-09-10"
      />,
    );

    expect(container.querySelector(".calendar-now-line")).toBeTruthy();
  });
});

describe("MonthCalendar - limite de eventos", () => {
  it("does not show overflow when a day has at most four events", () => {
    const { container } = renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(4)}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    expect(container.querySelectorAll(".calendar-item")).toHaveLength(4);
    expect(container.querySelector(".calendar-overflow")).toBeNull();
  });

  it("shows an overflow indicator when a day has more events than the limit", () => {
    const { container } = renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(5)}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    expect(container.querySelectorAll(".calendar-item")).toHaveLength(4);
    const indicator = container.querySelector(".calendar-overflow");
    expect(indicator).not.toBeNull();
    expect(indicator?.textContent).toContain("1 mais");
  });

  it("shows the correct overflow count for six or more events on one day", () => {
    const { container } = renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(6)}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    expect(container.querySelector(".calendar-overflow")?.textContent).toContain("2 mais");
  });

  it("calls onOverflowClick with the date key and not onDayClick when overflow is activated", () => {
    const onDayClick = vi.fn();
    const onOverflowClick = vi.fn();
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(5)}
        clientNames={names}
        serviceNames={names}
        onDayClick={onDayClick}
        onOverflowClick={onOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        todayKey="2026-09-10"
      />,
    );

    const overflow = screen.getByRole("button", {
      name: /ver todas as marcações de terça-feira, 15 de setembro/i,
    });
    fireEvent.click(overflow);
    expect(onOverflowClick).toHaveBeenCalledWith("2026-09-15");
    expect(onDayClick).not.toHaveBeenCalled();
  });

  it("still calls onDayClick when the future day number is clicked with overflow present", () => {
    const onDayClick = vi.fn();
    const { container } = renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(5)}
        clientNames={names}
        serviceNames={names}
        onDayClick={onDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        todayKey="2026-09-10"
      />,
    );

    const sep15Cell = Array.from(container.querySelectorAll(".calendar-day-cell")).find(
      (cell) =>
        cell.querySelector(".calendar-day-number")?.textContent === "15" &&
        !cell.classList.contains("bg-light"),
    );
    expect(sep15Cell).toBeTruthy();
    fireEvent.click(sep15Cell!);
    expect(onDayClick).toHaveBeenCalledWith("2026-09-15");
  });

  it("activates onOverflowClick from the keyboard on the overflow control", () => {
    const onOverflowClick = vi.fn();
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(5)}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={onOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    const overflow = screen.getByRole("button", {
      name: /ver todas as marcações de terça-feira, 15 de setembro/i,
    });
    overflow.focus();
    fireEvent.keyDown(overflow, { key: "Enter" });
    expect(onOverflowClick).toHaveBeenCalledWith("2026-09-15");
  });

  it("allows overflow activation on a past day without calling onDayClick", () => {
    const onDayClick = vi.fn();
    const onOverflowClick = vi.fn();
    const pastBusy = makeBusyDayAppointments(5, "2026-09-05");
    renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={pastBusy}
        clientNames={names}
        serviceNames={names}
        onDayClick={onDayClick}
        onOverflowClick={onOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        todayKey="2026-09-10"
      />,
    );

    const overflow = screen.getByRole("button", {
      name: /ver todas as marcações de sábado, 5 de setembro/i,
    });
    fireEvent.click(overflow);
    expect(onOverflowClick).toHaveBeenCalledWith("2026-09-05");
    expect(onDayClick).not.toHaveBeenCalled();
  });
});

describe("MonthCalendar - layout compacto (mobile)", () => {
  it("shows event counts instead of appointment cards", () => {
    const { container } = renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={makeBusyDayAppointments(3)}
        clientNames={names}
        serviceNames={names}
        onDayClick={noopOnDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={noopOnMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        layoutMode="compact"
        todayKey="2026-09-10"
      />,
    );

    expect(container.querySelectorAll(".calendar-item")).toHaveLength(0);
    expect(container.querySelector(".calendar-day-event-count")).not.toBeNull();
  });

  it("calls onMonthDaySelect instead of onDayClick when a day cell is activated", () => {
    const onDayClick = vi.fn();
    const onMonthDaySelect = vi.fn();
    const { container } = renderWithStore(
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        onDayClick={onDayClick}
        onOverflowClick={noopOnOverflowClick}
        onMonthDaySelect={onMonthDaySelect}
        onAppointmentClick={noopOnAppointmentClick}
        layoutMode="compact"
        todayKey="2026-09-10"
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

describe("AppointmentsViewSwitcher - período sempre visível", () => {
  it("keeps the period label visible at every width", () => {
    render(
      <AppointmentsViewSwitcher
        viewType="week"
        onViewTypeChange={noopViewChange}
        onPrev={noopOnDayClick}
        onNext={noopOnDayClick}
        onToday={noopOnDayClick}
        label="10 – 16 Setembro 2026"
      />,
    );

    const label = screen.getByRole("heading", { name: "10 – 16 Setembro 2026" });
    expect(label.className).not.toContain("d-none");
  });
});