import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  calendarNavigateNext,
  calendarNavigatePrev,
  calendarNavigateToday,
  reconcileMonthFocusedDateKey,
  useAppointmentsNavigation,
} from "./useAppointmentsNavigation";

const useMatchMediaMock = vi.fn((_query: string) => false);

vi.mock("./useMatchMedia", () => ({
  MOBILE_CALENDAR_MEDIA_QUERY: "(max-width: 767.98px)",
  useMatchMedia: (query: string) => useMatchMediaMock(query),
}));

describe("reconcileMonthFocusedDateKey", () => {
  it("keeps the focused day when it remains in the month grid", () => {
    expect(
      reconcileMonthFocusedDateKey(
        "2026-09-15",
        "2026-09-10",
        "2026-09-10",
        "Europe/Lisbon",
      ),
    ).toBe("2026-09-15");
  });

  it("falls back to today when the focused day is outside the grid", () => {
    expect(
      reconcileMonthFocusedDateKey(
        "2026-07-15",
        "2026-09-10",
        "2026-09-10",
        "Europe/Lisbon",
      ),
    ).toBe("2026-09-10");
  });

  it("falls back to the month anchor day when today is not in the grid", () => {
    expect(
      reconcileMonthFocusedDateKey(
        "2026-07-15",
        "2026-10-10",
        "2026-09-10",
        "Europe/Lisbon",
      ),
    ).toBe("2026-10-10");
  });
});

describe("calendar period navigation helpers", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("navigates months forward and backward", () => {
    expect(
      calendarNavigateNext("month", "2026-09-10", "Europe/Lisbon"),
    ).toBe("2026-10-10");
    expect(
      calendarNavigatePrev("month", "2026-09-10", "Europe/Lisbon"),
    ).toBe("2026-08-10");
  });

  it("navigates weeks and days", () => {
    expect(
      calendarNavigateNext("week", "2026-09-10", "Europe/Lisbon"),
    ).toBe("2026-09-17");
    expect(
      calendarNavigateNext("day", "2026-09-10", "Europe/Lisbon"),
    ).toBe("2026-09-11");
  });

  it("returns today in the company timezone", () => {
    expect(calendarNavigateToday("Europe/Lisbon")).toBe("2026-09-10");
  });
});

describe("useAppointmentsNavigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMatchMediaMock.mockReturnValue(false);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("opens create for a future day on desktop month click", () => {
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarDayClick("2026-09-15");
    });

    expect(onOpenCreate).toHaveBeenCalledWith("2026-09-15");
  });

  it("does not open create for a past day on desktop", () => {
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarDayClick("2026-09-05");
    });

    expect(onOpenCreate).not.toHaveBeenCalled();
  });

  it("selects the day on mobile month click without opening create", () => {
    useMatchMediaMock.mockReturnValue(true);
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarDayClick("2026-09-15");
    });

    expect(result.current.monthFocusedDateKey).toBe("2026-09-15");
    expect(onOpenCreate).not.toHaveBeenCalled();
  });

  it("switches to day view on desktop overflow", () => {
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarOverflowDayClick("2026-09-15");
    });

    expect(result.current.viewType).toBe("day");
    expect(result.current.currentDateKey).toBe("2026-09-15");
  });

  it("only selects the day on mobile overflow handler", () => {
    useMatchMediaMock.mockReturnValue(true);
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarOverflowDayClick("2026-09-15");
    });

    expect(result.current.viewType).toBe("month");
    expect(result.current.monthFocusedDateKey).toBe("2026-09-15");
  });

  it("reconciles month focus when the calendar date changes", () => {
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarDateChange("2026-10-10");
    });

    expect(result.current.currentDateKey).toBe("2026-10-10");
    expect(result.current.monthFocusedDateKey).toBe("2026-10-10");
  });

  it("does not open create for a past slot hour", () => {
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.handleCalendarSlotClick("2026-09-10", 8);
    });

    expect(onOpenCreate).not.toHaveBeenCalled();
  });

  it("exposes showCalendar as false in list view", () => {
    const onOpenCreate = vi.fn();
    const { result } = renderHook(() =>
      useAppointmentsNavigation({
        timezone: "Europe/Lisbon",
        onOpenCreate,
      }),
    );

    act(() => {
      result.current.setViewType("list");
    });

    expect(result.current.showCalendar).toBe(false);
  });
});
