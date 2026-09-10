import type { AvailableSlot } from "../../config/appointmentSlots";

interface AvailableTimeSlotsProps {
  slots: AvailableSlot[];
  selectedStart: string | null;
  onSelect: (start: string) => void;
  /**
   * Em edição, quando o horário atual do agendamento não se encaixa mais nos
   * slots gerados, ele é exibido isoladamente para preservar o agendamento
   * existente (ex.: "10:00 (horário atual do agendamento)"). Medida de UX; o
   * backend preserva uma referência existente se ela não for alterada.
   */
  currentLabel?: string | null;
}

export default function AvailableTimeSlots({
  slots,
  selectedStart,
  onSelect,
  currentLabel = null,
}: AvailableTimeSlotsProps) {
  if (slots.length === 0 && !currentLabel) {
    return <p className="text-muted mb-0">Não há horários disponíveis nesta data.</p>;
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      {slots.map((slot) => {
        const isSelected = slot.start === selectedStart;
        return (
          <button
            key={slot.start}
            type="button"
            className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-outline-primary"}`}
            aria-pressed={isSelected}
            onClick={() => onSelect(slot.start)}
          >
            {slot.localTime}
          </button>
        );
      })}
      {currentLabel && (
        <button
          type="button"
          className="btn btn-sm btn-outline-info"
          disabled
          title="Horário atual preservado na edição"
        >
          {currentLabel}
        </button>
      )}
      {slots.length === 0 && currentLabel && (
        <p className="w-100 text-muted small mb-0">
          Os demais horários desta data já estão ocupados ou fora da
          disponibilidade do funcionário.
        </p>
      )}
    </div>
  );
}