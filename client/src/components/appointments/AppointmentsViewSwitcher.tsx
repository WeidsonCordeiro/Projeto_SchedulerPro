import type { CalendarViewType } from "../../config/appointmentCalendar";

export interface AppointmentsViewSwitcherProps {
  viewType: CalendarViewType;
  onViewTypeChange: (view: CalendarViewType) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  label: string;
}

/**
 * Barra unificada de navegação temporal e seleção Mês | Semana | Dia | Lista.
 */
export default function AppointmentsViewSwitcher({
  viewType,
  onViewTypeChange,
  onPrev,
  onNext,
  onToday,
  label,
}: AppointmentsViewSwitcherProps) {
  const viewOptions: { value: CalendarViewType; label: string }[] = [
    { value: "month", label: "Mês" },
    { value: "week", label: "Semana" },
    { value: "day", label: "Dia" },
    { value: "list", label: "Lista" },
  ];

  return (
    <div className="calendar-toolbar">
      <div className="calendar-toolbar-nav d-flex align-items-center gap-2">
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={onPrev}
          aria-label="Anterior"
        >
          &#8249;
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-primary"
          onClick={onToday}
        >
          Hoje
        </button>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          onClick={onNext}
          aria-label="Próximo"
        >
          &#8250;
        </button>
      </div>

      <h2 className="calendar-toolbar-label calendar-toolbar-period" aria-live="polite">
        {label}
      </h2>

      <div
        className="calendar-toolbar-views btn-group btn-group-sm"
        role="group"
        aria-label="Visualização"
      >
        {viewOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`btn ${viewType === opt.value ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => onViewTypeChange(opt.value)}
            aria-pressed={viewType === opt.value}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
