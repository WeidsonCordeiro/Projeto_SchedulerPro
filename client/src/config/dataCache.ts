import { DASHBOARD_AUTO_REFRESH_MIN_MS } from "./dashboardRefresh";

/** Tempo em que dados em cache são considerados frescos (alinhado ao throttle O5). */
export const DEFAULT_DATA_STALE_MS = DASHBOARD_AUTO_REFRESH_MIN_MS;