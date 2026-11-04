import { fireEvent, render, screen, within } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import WeekMobileAgenda from "./WeekMobileAgenda";
import companyReducer from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";

function makeStore(timezone = "Europe/Lisbon") {
  return configureStore({
    reducer: { company: companyReducer },
    preloadedState: {
      company: {
        company: {
          id: "company1",
          name: "Test",
          timezone,
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
  });
}

function renderAgenda(ui: React.ReactElement) {
  return render(<Provider store={makeStore()}>{ui}</Provider>);
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

const clientNames = new Map([["client1", "Maria Silva"]]);
const serviceNames = new Map([["service1", "Corte"]]);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("WeekMobileAgenda", () => {
  it("renders exactly seven day sections", () => {
    const { container } = renderAgenda(
      <WeekMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onCreateForDay={vi.fn()}
      />,
    );

    expect(
      container.querySelectorAll(".week-mobile-agenda-day"),
    ).toHaveLength(7);
  });

  it("shows empty state for days without appointments", () => {
    renderAgenda(
      <WeekMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onCreateForDay={vi.fn()}
      />,
    );

    expect(screen.getAllByText("Sem marcações neste dia").length).toBe(7);
  });

  it("associates appointments with the correct day in chronological order", () => {
    const appointments = [
      makeAppointment({
        id: "late",
        startAt: "2026-09-10T15:00:00.000Z",
        endAt: "2026-09-10T15:30:00.000Z",
      }),
      makeAppointment({
        id: "early",
        startAt: "2026-09-10T08:00:00.000Z",
        endAt: "2026-09-10T08:30:00.000Z",
      }),
      makeAppointment({
        id: "other-day",
        startAt: "2026-09-11T10:00:00.000Z",
        endAt: "2026-09-11T10:30:00.000Z",
      }),
    ];

    const { container } = renderAgenda(
      <WeekMobileAgenda
        currentDateKey="2026-09-10"
        appointments={appointments}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate={false}
        onAppointmentClick={vi.fn()}
        onCreateForDay={vi.fn()}
      />,
    );

    const wedSection = container.querySelector(
      '[data-date-key="2026-09-10"]',
    );
    expect(wedSection).not.toBeNull();
    const wedButtons = within(wedSection as HTMLElement).getAllByRole("button");
    expect(wedButtons).toHaveLength(2);
    expect(wedButtons[0].getAttribute("aria-label")).toMatch(/09:00/);
    expect(wedButtons[1].getAttribute("aria-label")).toMatch(/16:00/);

    const thuSection = container.querySelector(
      '[data-date-key="2026-09-11"]',
    );
    expect(
      within(thuSection as HTMLElement).getAllByRole("button"),
    ).toHaveLength(1);
  });

  it("calls onAppointmentClick when a card is clicked", () => {
    const onAppointmentClick = vi.fn();
    renderAgenda(
      <WeekMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[makeAppointment()]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate={false}
        onAppointmentClick={onAppointmentClick}
        onCreateForDay={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Maria Silva/i }));
    expect(onAppointmentClick).toHaveBeenCalledTimes(1);
  });

  it("calls onCreateForDay for future days when canCreate", () => {
    const onCreateForDay = vi.fn();
    const { container } = renderAgenda(
      <WeekMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onCreateForDay={onCreateForDay}
      />,
    );

    const wedSection = container.querySelector(
      '[data-date-key="2026-09-10"]',
    );
    expect(wedSection).not.toBeNull();
    fireEvent.click(
      within(wedSection as HTMLElement).getByRole("button", {
        name: "Agendar neste dia",
      }),
    );
    expect(onCreateForDay).toHaveBeenCalledWith("2026-09-10");
  });

  it("does not show create action on past days", () => {
    renderAgenda(
      <WeekMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onCreateForDay={vi.fn()}
      />,
    );

    const monSection = document.querySelector('[data-date-key="2026-09-08"]');
    expect(monSection).not.toBeNull();
    expect(
      within(monSection as HTMLElement).queryByRole("button", {
        name: "Agendar neste dia",
      }),
    ).toBeNull();
  });
});
