import { useCallback } from "react";
import { DateTime } from "luxon";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import MonthCalendar from "./MonthCalendar";
import WeekCalendar from "./WeekCalendar";
import DayCalendar from "./DayCalendar";
import MonthDayAgendaList from "./MonthDayAgendaList";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";
import type { Appointment } from "../../types/appointment";
import type { CalendarViewType } from "../../config/appointmentCalendar";

/**
 * Container principal do calendário. Delega carregamento de dados e toolbar ao pai.
 */
interface CalendarViewProps {
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  viewType: CalendarViewType;
  currentDateKey: string;
  /** Chamado ao clicar em uma célula de dia/hora → abre formulário de criação com prefill. */
  onDayClick: (dateKey: string) => void;
  /** "+N mais" no mês → navega para a vista Dia com todas as marcações. */
  onOverflowDayClick?: (dateKey: string) => void;
  onSlotClick: (dateKey: string, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  /** Data de hoje no calendário local da empresa ("AAAA-MM-DD"). */
  todayKey?: string;
  /** Dia em foco na vista Mês mobile (lista abaixo da grelha). */
  monthFocusedDateKey?: string;
  onMonthDaySelect?: (dateKey: string) => void;
  canCreate?: boolean;
  onCreateForDay?: (dateKey: string) => void;
  isLoading?: boolean;
  loadError?: string | null;
  onLoadRetry?: () => void;
  isMobileViewport: boolean;
}

export default function CalendarView({
  appointments,
  clientNames,
  serviceNames,
  viewType,
  currentDateKey,
  onDayClick,
  onOverflowDayClick,
  onSlotClick,
  onAppointmentClick,
  todayKey,
  monthFocusedDateKey,
  onMonthDaySelect,
  canCreate = false,
  onCreateForDay,
  isLoading = false,
  loadError = null,
  onLoadRetry,
  isMobileViewport,
}: CalendarViewProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const isMobileMonth = viewType === "month" && isMobileViewport;
  const focusedMonthDay = monthFocusedDateKey ?? todayKey ?? currentDateKey;

  const scrollMonthDayPanel = useCallback(() => {
    queueMicrotask(() => {
      document
        .getElementById("month-day-agenda-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, []);

  const handleMonthOverflowClick = useCallback(
    (dateKey: string) => {
      if (isMobileMonth) {
        onMonthDaySelect?.(dateKey);
        scrollMonthDayPanel();
        return;
      }
      (onOverflowDayClick ?? onDayClick)(dateKey);
    },
    [isMobileMonth, onMonthDaySelect, onOverflowDayClick, onDayClick, scrollMonthDayPanel],
  );

  const handleMonthDaySelect = useCallback(
    (dateKey: string) => {
      onMonthDaySelect?.(dateKey);
    },
    [onMonthDaySelect],
  );

  if (viewType === "list") {
    return null;
  }

  return (
    <div className="calendar-surface">
      {isLoading && (
        <LoadingState compact label="A carregar agendamentos…" />
      )}

      {!isLoading && loadError && onLoadRetry && (
        <ErrorState message={loadError} onRetry={onLoadRetry} />
      )}

      {!isLoading && !loadError && viewType === "month" && (
        <>
          <MonthCalendar
            year={DateTime.fromISO(currentDateKey, { zone: timezone }).year}
            month={DateTime.fromISO(currentDateKey, { zone: timezone }).month}
            appointments={appointments}
            clientNames={clientNames}
            serviceNames={serviceNames}
            onDayClick={onDayClick}
            onOverflowClick={handleMonthOverflowClick}
            onMonthDaySelect={handleMonthDaySelect}
            onAppointmentClick={onAppointmentClick}
            selectedDateKey={isMobileMonth ? focusedMonthDay : undefined}
            layoutMode={isMobileMonth ? "compact" : "default"}
            className={isMobileMonth ? "month-calendar--with-day-list" : undefined}
            todayKey={todayKey}
          />
          {isMobileMonth && focusedMonthDay && todayKey && (
            <MonthDayAgendaList
              dateKey={focusedMonthDay}
              appointments={appointments}
              clientNames={clientNames}
              serviceNames={serviceNames}
              todayKey={todayKey}
              canCreate={canCreate}
              onAppointmentClick={onAppointmentClick}
              onCreateForDay={onCreateForDay ?? onDayClick}
            />
          )}
        </>
      )}

      {!isLoading && !loadError && viewType === "week" && (
        <WeekCalendar
          currentDateKey={currentDateKey}
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          onDayClick={(dk) => onDayClick(dk)}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onSlotClick}
          todayKey={todayKey}
        />
      )}

      {!isLoading && !loadError && viewType === "day" && (
        <DayCalendar
          currentDateKey={currentDateKey}
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onSlotClick}
          todayKey={todayKey}
        />
      )}
    </div>
  );
}
