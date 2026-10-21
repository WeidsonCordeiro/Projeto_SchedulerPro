import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DateTime } from "luxon";
import {
  buildMonthGrid,
  isSlotHourInPast,
  navigateDay,
  navigateMonth,
  navigateWeek,
} from "../config/appointmentCalendar";
import type { CalendarViewType } from "../config/appointmentCalendar";
import {
  MOBILE_CALENDAR_MEDIA_QUERY,
  useMatchMedia,
} from "./useMatchMedia";

export function reconcileMonthFocusedDateKey(
  focusedKey: string,
  monthAnchorKey: string,
  todayKey: string,
  timezone: string,
): string {
  const anchor = DateTime.fromISO(monthAnchorKey, { zone: timezone });
  if (!anchor.isValid) {
    return focusedKey;
  }
  const gridDates = new Set(
    buildMonthGrid(anchor.year, anchor.month, timezone).map((cell) => cell.date),
  );
  if (gridDates.has(focusedKey)) {
    return focusedKey;
  }
  if (gridDates.has(todayKey)) {
    return todayKey;
  }
  return anchor.toISODate() ?? focusedKey;
}

export function calendarNavigatePrev(
  viewType: CalendarViewType,
  currentDateKey: string,
  timezone: string,
): string | null {
  switch (viewType) {
    case "month":
      return navigateMonth(currentDateKey, -1, timezone);
    case "week":
      return navigateWeek(currentDateKey, -1, timezone);
    case "day":
      return navigateDay(currentDateKey, -1, timezone);
    default:
      return null;
  }
}

export function calendarNavigateNext(
  viewType: CalendarViewType,
  currentDateKey: string,
  timezone: string,
): string | null {
  switch (viewType) {
    case "month":
      return navigateMonth(currentDateKey, 1, timezone);
    case "week":
      return navigateWeek(currentDateKey, 1, timezone);
    case "day":
      return navigateDay(currentDateKey, 1, timezone);
    default:
      return null;
  }
}

export function calendarNavigateToday(timezone: string): string {
  return DateTime.now().setZone(timezone).toISODate() ?? "";
}

export interface UseAppointmentsNavigationOptions {
  timezone: string;
  onOpenCreate: (
    date?: string,
    time?: string,
    employeeId?: string,
  ) => void;
}

export function useAppointmentsNavigation({
  timezone,
  onOpenCreate,
}: UseAppointmentsNavigationOptions) {
  const todayKey = useMemo(
    () => DateTime.now().setZone(timezone).toISODate() ?? "",
    [timezone],
  );

  const [viewType, setViewType] = useState<CalendarViewType>("month");
  const [currentDateKey, setCurrentDateKey] = useState(todayKey);
  const [monthFocusedDateKey, setMonthFocusedDateKey] = useState(todayKey);
  const isMobileCalendar = useMatchMedia(MOBILE_CALENDAR_MEDIA_QUERY);
  const previousTodayKeyRef = useRef(todayKey);

  useEffect(() => {
    const previousTodayKey = previousTodayKeyRef.current;
    if (currentDateKey === previousTodayKey && todayKey !== previousTodayKey) {
      setCurrentDateKey(todayKey);
    }
    previousTodayKeyRef.current = todayKey;
  }, [todayKey, currentDateKey]);

  useEffect(() => {
    if (viewType !== "month") {
      return;
    }
    setMonthFocusedDateKey((prev) =>
      reconcileMonthFocusedDateKey(prev, currentDateKey, todayKey, timezone),
    );
  }, [viewType, currentDateKey, todayKey, timezone]);

  const handleCalendarDateChange = useCallback(
    (dateKey: string) => {
      setCurrentDateKey(dateKey);
      if (viewType === "month") {
        setMonthFocusedDateKey((prev) =>
          reconcileMonthFocusedDateKey(prev, dateKey, todayKey, timezone),
        );
      }
    },
    [viewType, todayKey, timezone],
  );

  const handleMonthDaySelect = useCallback((dateKey: string) => {
    setMonthFocusedDateKey(dateKey);
  }, []);

  const handleCalendarDayClick = useCallback(
    (dateKey: string) => {
      if (viewType === "month" && isMobileCalendar) {
        handleMonthDaySelect(dateKey);
        return;
      }
      if (dateKey >= todayKey) {
        onOpenCreate(dateKey);
      }
    },
    [viewType, isMobileCalendar, handleMonthDaySelect, todayKey, onOpenCreate],
  );

  const handleCalendarOverflowDayClick = useCallback(
    (dateKey: string) => {
      if (viewType === "month" && isMobileCalendar) {
        handleMonthDaySelect(dateKey);
        return;
      }
      setCurrentDateKey(dateKey);
      setViewType("day");
    },
    [viewType, isMobileCalendar, handleMonthDaySelect],
  );

  const handleCreateForMonthDay = useCallback(
    (dateKey: string) => {
      if (dateKey >= todayKey) {
        onOpenCreate(dateKey);
      }
    },
    [todayKey, onOpenCreate],
  );

  const handleCalendarSlotClick = useCallback(
    (dateKey: string, hour: number) => {
      if (!isSlotHourInPast(dateKey, hour, timezone)) {
        onOpenCreate(dateKey, `${String(hour).padStart(2, "0")}:00`);
      }
    },
    [timezone, onOpenCreate],
  );

  const showCalendar = viewType !== "list";

  return {
    viewType,
    setViewType,
    currentDateKey,
    monthFocusedDateKey,
    todayKey,
    isMobileCalendar,
    showCalendar,
    handleCalendarDateChange,
    handleMonthDaySelect,
    handleCalendarDayClick,
    handleCalendarOverflowDayClick,
    handleCreateForMonthDay,
    handleCalendarSlotClick,
  };
}
