import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  shouldRunVisibilityRefresh,
  useDashboardVisibilityRefresh,
} from "./useDashboardVisibilityRefresh";

function setDocumentVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
}

describe("shouldRunVisibilityRefresh", () => {
  it("allows refresh when the interval has elapsed", () => {
    expect(shouldRunVisibilityRefresh(50_000, 0, 45_000)).toBe(true);
    expect(shouldRunVisibilityRefresh(45_000, 0, 45_000)).toBe(true);
  });

  it("blocks refresh inside the throttle window", () => {
    expect(shouldRunVisibilityRefresh(44_999, 0, 45_000)).toBe(false);
    expect(shouldRunVisibilityRefresh(60_000, 20_000, 45_000)).toBe(false);
  });
});

describe("useDashboardVisibilityRefresh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    setDocumentVisibility("visible");
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("registers and removes the visibility listener", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const onRefresh = vi.fn();

    const { unmount } = renderHook(() =>
      useDashboardVisibilityRefresh({
        enabled: true,
        isInitialLoading: false,
        onRefresh,
        minIntervalMs: 45_000,
      }),
    );

    expect(addSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      "visibilitychange",
      expect.any(Function),
    );

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("does not refresh while initial loading is active", () => {
    const onRefresh = vi.fn();

    renderHook(() =>
      useDashboardVisibilityRefresh({
        enabled: true,
        isInitialLoading: true,
        onRefresh,
      }),
    );

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("ignores transitions to hidden without calling refresh", () => {
    const onRefresh = vi.fn();

    renderHook(() =>
      useDashboardVisibilityRefresh({
        enabled: true,
        isInitialLoading: false,
        onRefresh,
        minIntervalMs: 45_000,
      }),
    );

    setDocumentVisibility("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(onRefresh).not.toHaveBeenCalled();
  });

  it("throttles automatic refresh to the configured interval", () => {
    const onRefresh = vi.fn();

    renderHook(() =>
      useDashboardVisibilityRefresh({
        enabled: true,
        isInitialLoading: false,
        onRefresh,
        minIntervalMs: 45_000,
      }),
    );

    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(44_999);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(onRefresh).toHaveBeenCalledTimes(2);
  });
});
