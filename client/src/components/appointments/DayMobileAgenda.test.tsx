import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import DayMobileAgenda from "./DayMobileAgenda";
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

describe("DayMobileAgenda", () => {
  it("renders vertical agenda with appointments in order", () => {
    const appointments = [
      makeAppointment({
        id: "b",
        startAt: "2026-09-10T16:00:00.000Z",
        endAt: "2026-09-10T16:30:00.000Z",
      }),
      makeAppointment({
        id: "a",
        startAt: "2026-09-10T08:00:00.000Z",
        endAt: "2026-09-10T08:30:00.000Z",
      }),
    ];

    renderAgenda(
      <DayMobileAgenda
        currentDateKey="2026-09-10"
        appointments={appointments}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate={false}
        onAppointmentClick={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    );

    const cards = screen.getAllByRole("button", { name: /Maria Silva/i });
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute("aria-label")).toMatch(/09:00|10:00/);
  });

  it("shows empty state when there are no appointments", () => {
    renderAgenda(
      <DayMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    );

    expect(screen.getByText("Sem marcações neste dia")).toBeTruthy();
    expect(screen.getByText("Horários")).toBeTruthy();
  });

  it("calls onAppointmentClick when a card is clicked", () => {
    const onAppointmentClick = vi.fn();
    renderAgenda(
      <DayMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[makeAppointment()]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate={false}
        onAppointmentClick={onAppointmentClick}
        onSlotClick={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Maria Silva/i }));
    expect(onAppointmentClick).toHaveBeenCalledTimes(1);
  });

  it("calls onSlotClick for a future hour", () => {
    const onSlotClick = vi.fn();
    renderAgenda(
      <DayMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onSlotClick={onSlotClick}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "19:00" }));
    expect(onSlotClick).toHaveBeenCalledWith("2026-09-10", 19);
  });

  it("does not allow creation on past hour slots", () => {
    renderAgenda(
      <DayMobileAgenda
        currentDateKey="2026-09-10"
        appointments={[]}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey="2026-09-10"
        canCreate
        onAppointmentClick={vi.fn()}
        onSlotClick={vi.fn()}
      />,
    );

    const pastSlot = document.querySelector('[data-hour="8"]');
    expect(pastSlot).not.toBeNull();
    expect(pastSlot?.getAttribute("aria-disabled")).toBe("true");
    expect(pastSlot?.tagName).toBe("DIV");
  });
});
