interface CalendarNowLineProps {
  topPx: number;
}

/** Indicador visual da hora atual na grelha semana/dia (sem interação). */
export default function CalendarNowLine({ topPx }: CalendarNowLineProps) {
  return (
    <div
      className="calendar-now-line"
      style={{ top: topPx }}
      aria-hidden="true"
    />
  );
}
