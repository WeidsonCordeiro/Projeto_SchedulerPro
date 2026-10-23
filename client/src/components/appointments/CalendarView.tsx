import MonthView from "./MonthView";
import WeekCalendar from "./WeekCalendar";
import DayCalendar from "./DayCalendar";
import LoadingState from "../common/LoadingState";
import ErrorState from "../common/ErrorState";
import type { Appointment } from "../../types/appointment";
import type { CalendarViewType } from "../../config/appointmentCalendar";

/** Configuração específica da vista mensal (delegada a `MonthView`). */
export interface CalendarViewMonthConfig {
  /** Dia em foco na vista Mês mobile (lista abaixo da grelha). */
  monthFocusedDateKey?: string;
  onMonthDaySelect?: (dateKey: string) => void;
  /** "+N mais" no mês → navega para a vista Dia com todas as marcações. */
  onOverflowDayClick?: (dateKey: string) => void;
  canCreate?: boolean;
  onCreateForDay?: (dateKey: string) => void;
  isMobileViewport: boolean;
}

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
  onSlotClick: (dateKey: string, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  /** Semana/Dia: consulta rápida com âncora do bloco (popover). Se omitido, usa `onAppointmentClick`. */
  onTimeGridAppointmentClick?: (
    appointment: Appointment,
    anchor: HTMLElement,
  ) => void;
  /** Data de hoje no calendário local da empresa ("AAAA-MM-DD"). */
  todayKey?: string;
  month?: CalendarViewMonthConfig;
  isLoading?: boolean;
  loadError?: string | null;
  onLoadRetry?: () => void;
}

export default function CalendarView({
  appointments,
  clientNames,
  serviceNames,
  viewType,
  currentDateKey,
  onDayClick,
  onSlotClick,
  onAppointmentClick,
  onTimeGridAppointmentClick,
  todayKey,
  month,
  isLoading = false,
  loadError = null,
  onLoadRetry,
}: CalendarViewProps) {
  if (viewType === "list") {
    return null;
  }

  const monthViewport = month?.isMobileViewport ?? false;
  const isTimeGridView = viewType === "week" || viewType === "day";
  const surfaceClassName = [
    "calendar-surface",
    isTimeGridView ? "calendar-surface--time-grid" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={surfaceClassName}>
      {isLoading && (
        <LoadingState compact label="A carregar agendamentos…" />
      )}

      {!isLoading && loadError && onLoadRetry && (
        <ErrorState message={loadError} onRetry={onLoadRetry} />
      )}

      {!isLoading && !loadError && viewType === "month" && (
        <MonthView
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          currentDateKey={currentDateKey}
          onDayClick={onDayClick}
          onOverflowDayClick={month?.onOverflowDayClick}
          onAppointmentClick={onAppointmentClick}
          todayKey={todayKey}
          monthFocusedDateKey={month?.monthFocusedDateKey}
          onMonthDaySelect={month?.onMonthDaySelect}
          canCreate={month?.canCreate}
          onCreateForDay={month?.onCreateForDay}
          isMobileViewport={monthViewport}
        />
      )}

      {!isLoading && !loadError && viewType === "week" && (
        <WeekCalendar
          currentDateKey={currentDateKey}
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          onDayClick={(dk) => onDayClick(dk)}
          onAppointmentClick={(appointment, anchor) => {
            if (onTimeGridAppointmentClick) {
              onTimeGridAppointmentClick(appointment, anchor);
            } else {
              onAppointmentClick(appointment);
            }
          }}
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
          onAppointmentClick={(appointment, anchor) => {
            if (onTimeGridAppointmentClick) {
              onTimeGridAppointmentClick(appointment, anchor);
            } else {
              onAppointmentClick(appointment);
            }
          }}
          onSlotClick={onSlotClick}
          todayKey={todayKey}
        />
      )}
    </div>
  );
}
