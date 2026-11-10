import { useCallback, useEffect, useRef } from "react";

import { DASHBOARD_AUTO_REFRESH_MIN_MS } from "../config/dashboardRefresh";

export function shouldRunVisibilityRefresh(
  now: number,
  lastRefreshAt: number,
  minIntervalMs: number = DASHBOARD_AUTO_REFRESH_MIN_MS,
): boolean {
  return now - lastRefreshAt >= minIntervalMs;
}

export interface UseDashboardVisibilityRefreshOptions {
  enabled: boolean;
  isInitialLoading: boolean;
  onRefresh: () => void;
  minIntervalMs?: number;
}

/**
 * Dispara onRefresh quando a aba fica visible, respeitando throttle e carregamento inicial.
 */
export function useDashboardVisibilityRefresh({
  enabled,
  isInitialLoading,
  onRefresh,
  minIntervalMs = DASHBOARD_AUTO_REFRESH_MIN_MS,
}: UseDashboardVisibilityRefreshOptions): void {
  const lastAutoRefreshAtRef = useRef(0);
  const wasInitialLoadingRef = useRef(isInitialLoading);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (wasInitialLoadingRef.current && !isInitialLoading) {
      lastAutoRefreshAtRef.current = Date.now();
    }
    wasInitialLoadingRef.current = isInitialLoading;
  }, [isInitialLoading]);

  const tryAutoRefresh = useCallback(() => {
    if (!enabled || isInitialLoading) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    if (document.visibilityState !== "visible") {
      return;
    }
    const now = Date.now();
    if (!shouldRunVisibilityRefresh(now, lastAutoRefreshAtRef.current, minIntervalMs)) {
      return;
    }
    lastAutoRefreshAtRef.current = now;
    onRefreshRef.current();
  }, [enabled, isInitialLoading, minIntervalMs]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      tryAutoRefresh();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, tryAutoRefresh]);
}
