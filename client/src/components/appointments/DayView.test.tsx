import { render } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { describe, expect, it, vi } from "vitest";
import DayView from "./DayView";
import companyReducer from "../../store/slices/companySlice";

function renderView(mobile: boolean) {
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
        appointments={[]}
        clientNames={new Map()}
        serviceNames={new Map()}
        todayKey="2026-09-10"
        isMobileViewport={mobile}
        canCreate
        onSlotClick={vi.fn()}
        onAppointmentClick={vi.fn()}
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
});
