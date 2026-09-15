import type { CalendarViewType } from "../../config/appointmentCalendar";

/**
 * Barra de ferramentas do calendário com navegação e seletor de visualização.
 */
interface CalendarToolbarProps {
  currentDateKey: string;
  viewType: CalendarViewType;
  onViewTypeChange: (view: CalendarViewType) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  label: string;
}

export default function CalendarToolbar({
  viewType,
  onViewTypeChange,
  onPrev,
  onNext,
  onToday,
  label,
}: CalendarToolbarProps) {
  const viewOptions: { value: CalendarViewType; label: string }[] = [
    { value: "month", label: "Mês" },
    { value: "week", label: "Semana" },
    { value: "day", label: "Dia" },
    { value: "list", label: "Lista" },
  ];

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
      <div className="d-flex align-items-center gap-2">
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
        <h2 className="h5 mb-0 ms-2 d-none d-sm-inline">{label}</h2>
      </div>

      <div className="btn-group btn-group-sm" role="group" aria-label="Visualização">
        {viewOptions.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={`btn ${viewType === opt.value ? "btn-primary" : "btn-outline-primary"}`}
            onClick={() => onViewTypeChange(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
