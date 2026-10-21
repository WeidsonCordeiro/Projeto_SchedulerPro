import { useCallback } from "react";
import { DateTime } from "luxon";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import MonthCalendar from "./MonthCalendar";
import MonthDayAgendaList from "./MonthDayAgendaList";
import type { Appointment } from "../../types/appointment";

export interface MonthViewProps {
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  currentDateKey: string;
  /** Chamado ao clicar em uma célula de dia/hora → abre formulário de criação com prefill. */
  onDayClick: (dateKey: string) => void;
  /** "+N mais" no mês (desktop) → navega para a vista Dia com todas as marcações. */
  onOverflowDayClick?: (dateKey: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  /** Data de hoje no calendário local da empresa ("AAAA-MM-DD"). */
  todayKey?: string;
  /** Dia em foco na vista Mês mobile (lista abaixo da grelha). */
  monthFocusedDateKey?: string;
  onMonthDaySelect?: (dateKey: string) => void;
  canCreate?: boolean;
  onCreateForDay?: (dateKey: string) => void;
  isMobileViewport: boolean;
}

/**
 * Composição da vista mensal: grelha + lista diária em mobile.
 */
export default function MonthView({
  appointments,
  clientNames,
  serviceNames,
  currentDateKey,
  onDayClick,
  onOverflowDayClick,
  onAppointmentClick,
  todayKey,
  monthFocusedDateKey,
  onMonthDaySelect,
  canCreate = false,
  onCreateForDay,
  isMobileViewport,
}: MonthViewProps) {
  const timezone = useAppSelector(selectCompanyTimezone);
  const isMobileMonth = isMobileViewport;
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

  const { year, month } = DateTime.fromISO(currentDateKey, { zone: timezone });

  return (
    <>
      <MonthCalendar
        year={year}
        month={month}
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
  );
}
