import { renderHook, act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMatchMedia } from "./useMatchMedia";

describe("useMatchMedia", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the initial matches value from matchMedia", () => {
    const listeners: Array<() => void> = [];
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true,
        media: "(max-width: 767.98px)",
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener);
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        },
      })),
    );

    const { result } = renderHook(() => useMatchMedia("(max-width: 767.98px)"));
    expect(result.current).toBe(true);
  });

  it("updates when the media query change event fires", () => {
    let matches = false;
    const listeners: Array<() => void> = [];
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        get matches() {
          return matches;
        },
        media: "(max-width: 767.98px)",
        addEventListener: (_event: string, listener: () => void) => {
          listeners.push(listener);
        },
        removeEventListener: (_event: string, listener: () => void) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        },
      })),
    );

    const { result } = renderHook(() => useMatchMedia("(max-width: 767.98px)"));
    expect(result.current).toBe(false);

    act(() => {
      matches = true;
      listeners.forEach((listener) => listener());
    });
    expect(result.current).toBe(true);
  });
});
