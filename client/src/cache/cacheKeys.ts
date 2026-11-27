export const CACHE_KEYS = {
  clientsList: "cache:clients:list",
  servicesList: "cache:services:list",
  employeesList: "cache:employees:list",
  dashboardSummary: (startAt: string, endAt: string, upcomingLimit: number) =>
    `cache:dashboard:summary:${startAt}:${endAt}:${upcomingLimit}`,
} as const;