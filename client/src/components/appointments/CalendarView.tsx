import MonthView from "./MonthView";
import WeekView from "./WeekView";
import DayView from "./DayView";
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

/** Configuração mobile/desktop das vistas Semana e Dia. */
export interface CalendarViewTimeGridConfig {
  isMobileViewport: boolean;
  canCreate?: boolean;
  onCreateForDay?: (dateKey: string) => void;
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
  timeGrid?: CalendarViewTimeGridConfig;
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
  timeGrid,
  isLoading = false,
  loadError = null,
  onLoadRetry,
}: CalendarViewProps) {
  if (viewType === "list") {
    return null;
  }

  const monthViewport = month?.isMobileViewport ?? false;
  const timeGridMobile = timeGrid?.isMobileViewport ?? false;
  const isTimeGridView = viewType === "week" || viewType === "day";
  const useTimeGridSurface =
    isTimeGridView && !(timeGrid?.isMobileViewport ?? false);
  const surfaceClassName = [
    "calendar-surface",
    useTimeGridSurface ? "calendar-surface--time-grid" : "",
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
        <WeekView
          currentDateKey={currentDateKey}
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          todayKey={todayKey}
          isMobileViewport={timeGridMobile}
          canCreate={timeGrid?.canCreate}
          onCreateForDay={timeGrid?.onCreateForDay}
          onDayClick={onDayClick}
          onSlotClick={onSlotClick}
          onAppointmentClick={onAppointmentClick}
          onTimeGridAppointmentClick={onTimeGridAppointmentClick}
        />
      )}

      {!isLoading && !loadError && viewType === "day" && (
        <DayView
          currentDateKey={currentDateKey}
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          todayKey={todayKey}
          isMobileViewport={timeGridMobile}
          canCreate={timeGrid?.canCreate}
          onSlotClick={onSlotClick}
          onAppointmentClick={onAppointmentClick}
          onTimeGridAppointmentClick={onTimeGridAppointmentClick}
        />
      )}
    </div>
  );
}
