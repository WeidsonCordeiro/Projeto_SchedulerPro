import DayCalendar from "./DayCalendar";
import DayMobileAgenda from "./DayMobileAgenda";
import type { Appointment } from "../../types/appointment";

export interface DayViewProps {
  currentDateKey: string;
  appointments: Appointment[];
  clientNames: Map<string, string>;
  serviceNames: Map<string, string>;
  todayKey?: string;
  isMobileViewport: boolean;
  canCreate?: boolean;
  onSlotClick: (dateKey: string, hour: number) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  onTimeGridAppointmentClick?: (
    appointment: Appointment,
    anchor: HTMLElement,
  ) => void;
}

export default function DayView({
  currentDateKey,
  appointments,
  clientNames,
  serviceNames,
  todayKey,
  isMobileViewport,
  canCreate = false,
  onSlotClick,
  onAppointmentClick,
  onTimeGridAppointmentClick,
}: DayViewProps) {
  if (isMobileViewport) {
    return (
      <DayMobileAgenda
        currentDateKey={currentDateKey}
        appointments={appointments}
        clientNames={clientNames}
        serviceNames={serviceNames}
        todayKey={todayKey ?? ""}
        canCreate={canCreate}
        onAppointmentClick={onAppointmentClick}
        onSlotClick={onSlotClick}
      />
    );
  }

  return (
    <DayCalendar
      currentDateKey={currentDateKey}
      appointments={appointments}
      clientNames={clientNames}
      serviceNames={serviceNames}
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
