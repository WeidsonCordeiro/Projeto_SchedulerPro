import { render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import { buildMonthGrid } from "../../config/appointmentCalendar";
import MonthCalendar from "./MonthCalendar";
import companyReducer from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";

function makeStore(timezone = "Europe/Lisbon") {
  return configureStore({
    reducer: { company: companyReducer },
    preloadedState: {
      company: {
        company: {
          id: "company1",
          name: "salao",
          timezone,
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
  });
}

function renderCalendar(
  props: Partial<React.ComponentProps<typeof MonthCalendar>> = {},
) {
  const onDayClick = vi.fn();
  const onOverflowClick = vi.fn();
  const onMonthDaySelect = vi.fn();
  const onAppointmentClick = vi.fn();
  return render(
    <Provider store={makeStore()}>
      <MonthCalendar
        year={2026}
        month={9}
        appointments={[]}
        clientNames={new Map()}
        serviceNames={new Map()}
        onDayClick={onDayClick}
        onOverflowClick={onOverflowClick}
        onMonthDaySelect={onMonthDaySelect}
        onAppointmentClick={onAppointmentClick}
        todayKey="2026-09-10"
        {...props}
      />
    </Provider>,
  );
}

function makeAppointment(dateKey: string, id = "a1"): Appointment {
  return {
    id,
    companyId: "c1",
    clientId: "client1",
    serviceId: "service1",
    employeeId: "emp1",
    startAt: `${dateKey}T10:00:00.000Z`,
    endAt: `${dateKey}T10:30:00.000Z`,
    status: "scheduled",
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("MonthCalendar - grelha 7x6", () => {
  it("renders weekday header and 42 day cells in grid wrappers", () => {
    const { container } = renderCalendar();

    expect(container.querySelector(".month-calendar__weekdays")).toBeInTheDocument();
    expect(container.querySelector(".month-calendar__weeks")).toBeInTheDocument();
    expect(container.querySelectorAll(".month-calendar__weekday")).toHaveLength(7);
    expect(container.querySelectorAll(".calendar-day-cell")).toHaveLength(42);
    expect(screen.getByText("Seg")).toBeInTheDocument();
  });

  it("places consecutive weeks on the same weekday column (7-day stride)", () => {
    const { container } = renderCalendar();
    const cells = Array.from(container.querySelectorAll(".calendar-day-cell"));
    const grid = buildMonthGrid(2026, 9, "Europe/Lisbon", "2026-09-10");

    expect(cells[0].querySelector(".calendar-day-number")?.textContent).toBe(
      String(grid[0].dayOfMonth),
    );
    expect(cells[7].querySelector(".calendar-day-number")?.textContent).toBe(
      String(grid[7].dayOfMonth),
    );
    expect(cells[14].querySelector(".calendar-day-number")?.textContent).toBe(
      String(grid[14].dayOfMonth),
    );
  });

  it("marks adjacent-month days with bg-light", () => {
    const { container } = renderCalendar();
    const adjacent = container.querySelectorAll(".calendar-day-cell.bg-light");
    expect(adjacent.length).toBeGreaterThan(0);
  });
});

describe("MonthCalendar - compact layout", () => {
  it("shows event count instead of appointment pills", () => {
    const { container } = renderCalendar({
      layoutMode: "compact",
      appointments: [makeAppointment("2026-09-15")],
    });

    expect(container.querySelector(".calendar-day-event-count")).toHaveTextContent("1");
    expect(container.querySelector(".calendar-item")).not.toBeInTheDocument();
  });
});

describe("MonthCalendar - overflow", () => {
  it("shows +N mais when more than four appointments on a day", () => {
    const appointments = Array.from({ length: 5 }, (_, i) =>
      makeAppointment("2026-09-15", `busy${i}`),
    );
    renderCalendar({ appointments });

    expect(
      screen.getByRole("button", { name: /ver todas as marcações de terça-feira, 15 de setembro/i }),
    ).toBeInTheDocument();
  });
});
