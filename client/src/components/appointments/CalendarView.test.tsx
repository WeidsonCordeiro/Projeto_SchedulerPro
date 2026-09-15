import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import CalendarView from "./CalendarView";
import MonthCalendar from "./MonthCalendar";
import WeekCalendar from "./WeekCalendar";
import DayCalendar from "./DayCalendar";
import CalendarToolbar from "./CalendarToolbar";
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

const noopViewChange = vi.fn();
const noopOnDayClick = vi.fn();
const noopOnSlotClick = vi.fn();
const noopOnAppointmentClick = vi.fn();

describe("CalendarToolbar", () => {
  it("renders view buttons and navigation", () => {
    render(
      <CalendarToolbar
        currentDateKey="2026-09-10"
        viewType="month"
        onViewTypeChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        label="Setembro 2026"
      />,
    );

    expect(screen.getByRole("button", { name: "Mês" })).toHaveClass("btn-primary");
    expect(screen.getByRole("button", { name: "Semana" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lista" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
    expect(screen.getByText("Setembro 2026")).toBeInTheDocument();
  });

  it("calls the right handlers", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onToday = vi.fn();
    const onViewTypeChange = vi.fn();
    render(
      <CalendarToolbar
        currentDateKey="2026-09-10"
        viewType="month"
        onViewTypeChange={onViewTypeChange}
        onPrev={onPrev}
        onNext={onNext}
        onToday={onToday}
        label="Setembro 2026"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    fireEvent.click(screen.getByRole("button", { name: "Semana" }));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
    expect(onToday).toHaveBeenCalled();
    expect(onViewTypeChange).toHaveBeenCalledWith("week");
  });
});

describe("CalendarView", () => {
  it("navigates months with the toolbar", () => {
    const onDateChange = vi.fn();
    renderWithStore(
      <CalendarView
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        viewType="month"
        onViewTypeChange={noopViewChange}
        currentDateKey="2026-09-10"
        onDateChange={onDateChange}
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-10-10");
    fireEvent.click(screen.getByRole("button", { name: "Anterior" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-08-10");
  });

  it("navigates weeks when in week view", () => {
    const onDateChange = vi.fn();
    renderWithStore(
      <CalendarView
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        viewType="week"
        onViewTypeChange={noopViewChange}
        currentDateKey="2026-09-10"
        onDateChange={onDateChange}
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-17");
  });

  it("jumps to today", () => {
    const onDateChange = vi.fn();
    renderWithStore(
      <CalendarView
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        viewType="day"
        onViewTypeChange={noopViewChange}
        currentDateKey="2026-01-01"
        onDateChange={onDateChange}
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Hoje" }));
    expect(onDateChange).toHaveBeenCalledWith("2026-09-10");
  });

  it("renders the correct title per view", () => {
    const { rerender } = renderWithStore(
      <CalendarView
        appointments={[]}
        clientNames={names}
        serviceNames={names}
        viewType="day"
        onViewTypeChange={noopViewChange}
        currentDateKey="2026-09-10"
        onDateChange={noopViewChange}
        onDayClick={noopOnDayClick}
        onSlotClick={noopOnSlotClick}
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );
    expect(screen.getByText("10/09/2026")).toBeInTheDocument();

    rerender(
      <Provider store={makeStore()}>
        <CalendarView
          appointments={[]}
          clientNames={names}
          serviceNames={names}
          viewType="week"
          onViewTypeChange={noopViewChange}
          currentDateKey="2026-09-10"
          onDateChange={noopViewChange}
          onDayClick={noopOnDayClick}
          onSlotClick={noopOnSlotClick}
          onAppointmentClick={noopOnAppointmentClick}
        />
      </Provider>,
    );
    expect(screen.getByText(/07\/09.*–.*13\/09/i)).toBeInTheDocument();
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
        onAppointmentClick={noopOnAppointmentClick}
      />,
    );

    expect(screen.getByText("Seg")).toBeInTheDocument();
    expect(screen.getByText("Dom")).toBeInTheDocument();
    // O agendamento aparece como item clicável (título com nome do cliente)
    expect(screen.getByTitle(/Maria Silva/)).toBeInTheDocument();
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
        onDayClick={noopOnDayClick}
        onAppointmentClick={noopOnAppointmentClick}
        onSlotClick={noopOnSlotClick}
      />,
    );

    expect(screen.getByText("Qui")).toBeInTheDocument();
    expect(screen.getByText("Maria Silva")).toBeInTheDocument();
  });

  it("calls onSlotClick with the date and hour", () => {
    const onSlotClick = vi.fn();
    renderWithStore(
      <WeekCalendar
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={names}
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
    expect(onAppointmentClick).toHaveBeenCalledWith(expect.objectContaining({ id: "appt1" }));
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
});