/** Conteúdo partilhado dos cartões de agendamento (Mês, Semana, Dia). */
export interface AppointmentCalendarEventBodyProps {
  timeLabel: string;
  clientLabel: string;
  serviceLabel: string;
  statusLabel: string;
  showStatusText?: boolean;
}

export default function AppointmentCalendarEventBody({
  timeLabel,
  clientLabel,
  serviceLabel,
  statusLabel,
  showStatusText = false,
}: AppointmentCalendarEventBodyProps) {
  return (
    <>
      <span className="calendar-event-time text-truncate d-block">{timeLabel}</span>
      <span className="calendar-event-client text-truncate d-block">{clientLabel}</span>
      <span className="calendar-event-service text-truncate d-block">{serviceLabel}</span>
      {showStatusText ? (
        <span className="calendar-event-status text-truncate d-block">{statusLabel}</span>
      ) : (
        <span className="visually-hidden">{statusLabel}</span>
      )}
    </>
  );
}

/** Classes de superfície alinhadas à pill do mês (tier comfortable). */
export const APPOINTMENT_CALENDAR_EVENT_SURFACE_CLASS =
  "calendar-week-event calendar-week-event--comfortable";
