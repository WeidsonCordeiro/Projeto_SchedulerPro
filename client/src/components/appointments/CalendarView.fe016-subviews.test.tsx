import { fireEvent, render, screen } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CalendarView from "./CalendarView";
import AppointmentsViewSwitcher from "./AppointmentsViewSwitcher";
import companyReducer from "../../store/slices/companySlice";
import type { CalendarViewType } from "../../config/appointmentCalendar";

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
  viewType: CalendarViewType,
  extra: Partial<React.ComponentProps<typeof CalendarView>> = {},
) {
  const onDayClick = vi.fn();
  const onSlotClick = vi.fn();
  const onAppointmentClick = vi.fn();

  const ui = (
    <CalendarView
      appointments={[]}
      clientNames={new Map()}
      serviceNames={new Map()}
      viewType={viewType}
      currentDateKey="2026-09-10"
      onDayClick={onDayClick}
      onSlotClick={onSlotClick}
      onAppointmentClick={onAppointmentClick}
      todayKey="2026-09-10"
      month={{ isMobileViewport: false }}
      timeGrid={{ isMobileViewport: false }}
      {...extra}
    />
  );

  const view = render(<Provider store={makeStore()}>{ui}</Provider>);
  return { ...view, onDayClick, onSlotClick, onAppointmentClick };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("FE-016 — CalendarView subviews", () => {
  it.each([
    ["month", "calendar-view-month"],
    ["week", "calendar-view-week"],
    ["day", "calendar-view-day"],
  ] as const)("mounts %s subview with test id", (viewType, testId) => {
    renderCalendar(viewType);
    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it("does not render a surface when viewType is list", () => {
    const { container } = renderCalendar("list");
    expect(container.querySelector(".calendar-surface")).toBeNull();
    expect(screen.queryByTestId("calendar-view-month")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calendar-view-week")).not.toBeInTheDocument();
    expect(screen.queryByTestId("calendar-view-day")).not.toBeInTheDocument();
  });

  it.each(["month", "week", "day"] as const)(
    "shows load error and retry in %s view",
    (viewType) => {
      const onLoadRetry = vi.fn();
      renderCalendar(viewType, {
        loadError: "Falhou.",
        onLoadRetry,
      });
      fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));
      expect(onLoadRetry).toHaveBeenCalledTimes(1);
    },
  );

  it("routes day grid slot activation to onSlotClick", () => {
    const { container, onSlotClick } = renderCalendar("day");
    expect(screen.getByTestId("calendar-view-day")).toBeInTheDocument();

    const slots = container.querySelectorAll(".day-slot[role='button']");
    expect(slots.length).toBeGreaterThan(0);
    fireEvent.click(slots[0] as HTMLElement);
    expect(onSlotClick).toHaveBeenCalledWith(
      "2026-09-10",
      expect.any(Number),
    );
  });

  it("keeps mobile week and day subviews distinct", () => {
    const { rerender } = renderCalendar("week", {
      timeGrid: { isMobileViewport: true, canCreate: true, onCreateForDay: vi.fn() },
    });
    expect(screen.getByTestId("calendar-view-week")).toBeInTheDocument();
    expect(screen.getByTestId("week-mobile-agenda")).toBeInTheDocument();

    rerender(
      <Provider store={makeStore()}>
        <CalendarView
          appointments={[]}
          clientNames={new Map()}
          serviceNames={new Map()}
          viewType="day"
          currentDateKey="2026-09-10"
          onDayClick={vi.fn()}
          onSlotClick={vi.fn()}
          onAppointmentClick={vi.fn()}
          todayKey="2026-09-10"
          timeGrid={{ isMobileViewport: true, canCreate: true }}
        />
      </Provider>,
    );

    expect(screen.getByTestId("calendar-view-day")).toBeInTheDocument();
    expect(screen.getByTestId("day-mobile-agenda")).toBeInTheDocument();
    expect(screen.queryByTestId("week-mobile-agenda")).not.toBeInTheDocument();
  });
});

describe("FE-016 — AppointmentsViewSwitcher", () => {
  it("exposes navigation controls with accessible names", () => {
    render(
      <AppointmentsViewSwitcher
        viewType="month"
        onViewTypeChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        label="Setembro 2026"
      />,
    );

    expect(screen.getByRole("button", { name: "Anterior" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próximo" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Setembro 2026" })).toBeInTheDocument();
  });

  it("updates aria-pressed when parent switches to day view", () => {
    const { rerender } = render(
      <AppointmentsViewSwitcher
        viewType="month"
        onViewTypeChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        label="Setembro 2026"
      />,
    );

    expect(screen.getByRole("button", { name: "Mês" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    rerender(
      <AppointmentsViewSwitcher
        viewType="day"
        onViewTypeChange={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onToday={vi.fn()}
        label="10 Setembro 2026"
      />,
    );

    expect(screen.getByRole("button", { name: "Dia" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Mês" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});