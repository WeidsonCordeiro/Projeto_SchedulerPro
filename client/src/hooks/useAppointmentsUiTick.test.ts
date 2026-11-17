import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  APPOINTMENTS_UI_TICK_INTERVAL_MS,
  useAppointmentsUiTick,
} from "./useAppointmentsUiTick";

describe("useAppointmentsUiTick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-10T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current UTC ISO on mount", () => {
    const { result } = renderHook(() => useAppointmentsUiTick(true));
    expect(result.current).toBe("2026-09-10T12:00:00.000Z");
  });

  it("updates uiNowISO after each interval", () => {
    const { result } = renderHook(() => useAppointmentsUiTick(true));

    act(() => {
      vi.advanceTimersByTime(APPOINTMENTS_UI_TICK_INTERVAL_MS);
    });
    expect(result.current).toBe("2026-09-10T12:00:30.000Z");
  });

  it("does not register an interval when disabled", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const { unmount } = renderHook(() => useAppointmentsUiTick(false));

    expect(setIntervalSpy).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(APPOINTMENTS_UI_TICK_INTERVAL_MS * 2);
    });

    unmount();
    setIntervalSpy.mockRestore();
  });

  it("clears the interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderHook(() => useAppointmentsUiTick(true));

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("refreshes uiNowISO immediately when enabled becomes true", () => {
    const { result, rerender } = renderHook(
      ({ enabled }) => useAppointmentsUiTick(enabled),
      { initialProps: { enabled: false } },
    );

    expect(result.current).toBe("2026-09-10T12:00:00.000Z");

    act(() => {
      vi.setSystemTime(new Date("2026-09-10T12:15:00.000Z"));
    });

    rerender({ enabled: true });

    expect(result.current).toBe("2026-09-10T12:15:00.000Z");

    act(() => {
      vi.advanceTimersByTime(APPOINTMENTS_UI_TICK_INTERVAL_MS);
    });
    expect(result.current).toBe("2026-09-10T12:15:30.000Z");

    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    rerender({ enabled: false });
    rerender({ enabled: true });
    rerender({ enabled: false });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("uses a single interval across re-renders with the same enabled flag", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    const { rerender } = renderHook(
      ({ enabled }) => useAppointmentsUiTick(enabled),
      { initialProps: { enabled: true } },
    );

    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    rerender({ enabled: true });
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    setIntervalSpy.mockRestore();
  });
});