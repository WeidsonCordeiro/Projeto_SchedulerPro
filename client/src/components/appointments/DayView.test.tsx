import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import DayView from "./DayView";
import companyReducer from "../../store/slices/companySlice";
import type { Appointment } from "../../types/appointment";

const sampleAppointment: Appointment = {
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
};

function renderView(mobile: boolean, onAppointmentClick = vi.fn()) {
  const store = configureStore({
    reducer: { company: companyReducer },
    preloadedState: {
      company: {
        company: {
          id: "c1",
          name: "T",
          timezone: "Europe/Lisbon",
          isActive: true,
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      },
    },
  });

  return render(
    <Provider store={store}>
      <DayView
        currentDateKey="2026-09-10"
        appointments={mobile ? [] : [sampleAppointment]}
        clientNames={new Map([["client1", "Maria Silva"]])}
        serviceNames={new Map([["service1", "Corte de cabelo"]])}
        todayKey="2026-09-10"
        isMobileViewport={mobile}
        canCreate
        onSlotClick={vi.fn()}
        onAppointmentClick={onAppointmentClick}
      />
    </Provider>,
  );
}

describe("DayView", () => {
  it("renders DayMobileAgenda without day grid on mobile", () => {
    const { container } = renderView(true);
    expect(container.querySelector(".day-calendar-time-body")).toBeNull();
    expect(container.querySelector('[data-testid="day-mobile-agenda"]')).not.toBeNull();
  });

  it("renders DayCalendar on desktop", () => {
    const { container } = renderView(false);
    expect(container.querySelector(".day-calendar")).not.toBeNull();
    expect(container.querySelector('[data-testid="day-mobile-agenda"]')).toBeNull();
  });

  it("forwards grid appointment clicks to onAppointmentClick on desktop", () => {
    const onAppointmentClick = vi.fn();
    renderView(false, onAppointmentClick);
    fireEvent.click(
      screen.getByRole("button", { name: /Agendamento Maria Silva/i }),
    );
    expect(onAppointmentClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: "appt1" }),
    );
  });
});
