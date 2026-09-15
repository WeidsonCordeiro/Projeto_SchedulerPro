import { useCallback, useMemo } from "react";
import { DateTime } from "luxon";
import {
  navigateMonth,
  navigateWeek,
  navigateDay,
} from "../../config/appointmentCalendar";
import { formatMonthYear } from "../../config/appointmentTime";
import { useAppSelector } from "../../store";
import { selectCompanyTimezone } from "../../store/slices/companySlice";
import CalendarToolbar from "./CalendarToolbar";
import MonthCalendar from "./MonthCalendar";
import WeekCalendar from "./WeekCalendar";
import DayCalendar from "./DayCalendar";
import type { Appointment } from "../../types/appointment";
import type { CalendarViewType } from "../../config/appointmentCalendar";

/**
 * Container principal do calendário. Gerencia a view ativa, navegação entre
 * períodos, e delega carregamento de dados ao componente pai (AppointmentsPage).
 *
 * O componente é um "controlled container": recebe appointments, labels e
 * callbacks; o pai controla loading/error/range.
 */
interface CalendarViewProps {
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  viewType: CalendarViewType;
  onViewTypeChange: (view: CalendarViewType) => void;
  currentDateKey: string;
  onDateChange: (dateKey: string) => void;
  /** Chamado ao clicar em uma célula de dia/hora → abre formulário de criação com prefill. */
  onDayClick: (dateKey: string) => void;
  onSlotClick: (dateKey: string, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  /** Data de hoje no calendário local da empresa ("AAAA-MM-DD"). */
  todayKey?: string;
}

export default function CalendarView({
  appointments,
  clientNames,
  serviceNames,
  viewType,
  onViewTypeChange,
  currentDateKey,
  onDateChange,
  onDayClick,
  onSlotClick,
  onAppointmentClick,
  todayKey,
}: CalendarViewProps) {
  const timezone = useAppSelector(selectCompanyTimezone);

  const title = useMemo(() => {
    const dt = DateTime.fromISO(currentDateKey, { zone: timezone });
    if (!dt.isValid) return "";
    switch (viewType) {
      case "month":
        return formatMonthYear(dt.year, dt.month, timezone);
      case "week": {
        const ws = dt.minus({ days: dt.weekday - 1 });
        const we = ws.plus({ days: 6 });
        const wsShort = ws.toFormat("dd/MM");
        const weShort = we.toFormat("dd/MM");
        return `${wsShort} – ${weShort}`;
      }
      case "day":
        return dt.toFormat("dd/MM/yyyy");
      case "list":
        return "Lista de agendamentos";
      default:
        return "";
    }
  }, [currentDateKey, viewType, timezone]);

  const handlePrev = useCallback(() => {
    switch (viewType) {
      case "month":
        onDateChange(navigateMonth(currentDateKey, -1, timezone));
        break;
      case "week":
        onDateChange(navigateWeek(currentDateKey, -1, timezone));
        break;
      case "day":
        onDateChange(navigateDay(currentDateKey, -1, timezone));
        break;
      default:
        break;
    }
  }, [viewType, currentDateKey, timezone, onDateChange]);

  const handleNext = useCallback(() => {
    switch (viewType) {
      case "month": {
        const nextKey = navigateMonth(currentDateKey, 1, timezone);
        onDateChange(nextKey);
        break;
      }
      case "week":
        onDateChange(navigateWeek(currentDateKey, 1, timezone));
        break;
      case "day":
        onDateChange(navigateDay(currentDateKey, 1, timezone));
        break;
      default:
        break;
    }
  }, [viewType, currentDateKey, timezone, onDateChange]);

  const handleToday = useCallback(() => {
    onDateChange(DateTime.now().setZone(timezone).toISODate() ?? "");
  }, [timezone, onDateChange]);

  if (viewType === "list") {
    return null;
  }

  return (
    <div>
      <CalendarToolbar
        currentDateKey={currentDateKey}
        viewType={viewType}
        onViewTypeChange={onViewTypeChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        label={title}
      />

      {viewType === "month" && (
        <MonthCalendar
          year={DateTime.fromISO(currentDateKey, { zone: timezone }).year}
          month={DateTime.fromISO(currentDateKey, { zone: timezone }).month}
          appointments={appointments}
          clientNames={clientNames}
          serviceNames={serviceNames}
          onDayClick={onDayClick}
          onAppointmentClick={onAppointmentClick}
          todayKey={todayKey}
        />
      )}

      {viewType === "week" && (
        <WeekCalendar
          currentDateKey={currentDateKey}
          appointments={appointments}
          clientNames={clientNames}
          onDayClick={(dk) => onDayClick(dk)}
          onAppointmentClick={onAppointmentClick}
          onSlotClick={onSlotClick}
          todayKey={todayKey}
        />
      )}

      {viewType === "day" && (
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
