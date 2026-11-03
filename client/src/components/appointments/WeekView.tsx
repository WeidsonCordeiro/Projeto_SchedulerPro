import WeekCalendar from "./WeekCalendar";
import WeekMobileAgenda from "./WeekMobileAgenda";
import type { Appointment } from "../../types/appointment";

export interface WeekViewProps {
  currentDateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  todayKey?: string;
  isMobileViewport: boolean;
  canCreate?: boolean;
  onDayClick: (dateKey: string) => void;
  onSlotClick: (dateKey: string, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeGridAppointmentClick?: (
    appointment: Appointment,
    anchor: HTMLElement,
  ) => void;
  onCreateForDay?: (dateKey: string) => void;
}

export default function WeekView({
  currentDateKey,
  appointments,
  clientNames,
  serviceNames,
  todayKey,
  isMobileViewport,
  canCreate = false,
  onDayClick,
  onSlotClick,
  onAppointmentClick,
  onTimeGridAppointmentClick,
  onCreateForDay,
}: WeekViewProps) {
  if (isMobileViewport) {
    const createHandler = onCreateForDay ?? onDayClick;

    return (
      <WeekMobileAgenda
        currentDateKey={currentDateKey}
        appointments={appointments}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey={todayKey ?? ""}
        canCreate={canCreate}
        onAppointmentClick={onAppointmentClick}
        onCreateForDay={createHandler}
      />
    );
  }

  return (
    <WeekCalendar
      currentDateKey={currentDateKey}
      appointments={appointments}
      clientNames={clientNames}
      serviceNames={serviceNames}
      onDayClick={onDayClick}
      onSlotClick={onSlotClick}
      todayKey={todayKey}
      onAppointmentClick={(appointment, anchor) => {
        if (onTimeGridAppointmentClick) {
          onTimeGridAppointmentClick(appointment, anchor);
        } else {
          onAppointmentClick(appointment);
        }
      }}
    />
  );
}
