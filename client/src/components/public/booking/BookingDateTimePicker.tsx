import EmptyState from "../../common/EmptyState";
import ErrorState from "../../common/ErrorState";
import LoadingState from "../../common/LoadingState";
import {
  BOOKING_NO_SLOTS_MESSAGE,
  formatSlotTime,
  getSlotKey,
} from "../../../config/publicBooking";
import type { PublicAvailabilitySlot } from "../../../types/publicBooking";

interface BookingDateTimePickerProps {
  date: string;
  onDateChange: (date: string) => void;
  /** "AAAA-MM-DD" de hoje no fuso conhecido; limita o calendário ao futuro. */
  minDate: string;
  /** Fuso devolvido pela disponibilidade; `null` enquanto não foi carregada. */
  timezone: string | null;
  slots: PublicAvailabilitySlot[];
  selectedSlot: PublicAvailabilitySlot | null;
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
  onSelectSlot: (slot: PublicAvailabilitySlot) => void;
}

const DATE_INPUT_ID = "booking-date";
const DATE_HINT_ID = "booking-date-hint";

/**
 * Escolha da data e do horário.
 *
 * Os horários vêm todos da resposta de disponibilidade — nunca de um cálculo
 * local. O `startAt` selecionado é o objeto inteiro, não a hora formatada: o
 * instante original é o que se envia no POST e o que o backend valida.
 *
 * Os botões de horário carregam `aria-pressed` em vez de serem radios porque
 * esta seleção não bloqueia as outras: escolher 09:00 e depois 14:00 é uma
 * troca normal, não uma segunda resposta a uma pergunta. Com radios, escolher
 * 14:00 exigiria primeiro "desmarcar" as 09:00.
 */
export default function BookingDateTimePicker({
  date,
  onDateChange,
  minDate,
  timezone,
  slots,
  selectedSlot,
  isLoading,
  errorMessage,
  onRetry,
  onSelectSlot,
}: BookingDateTimePickerProps) {
  return (
    <section className="booking-section" aria-labelledby="booking-schedule-title">
      <h3 id="booking-schedule-title" className="booking-section-title">
        Escolha a data e a hora
      </h3>

      <div className="booking-field">
        <label className="form-label" htmlFor={DATE_INPUT_ID}>
          Data
        </label>
        <input
          id={DATE_INPUT_ID}
          className="form-control"
          type="date"
          value={date}
          min={minDate}
          onChange={(event) => onDateChange(event.target.value)}
          aria-describedby={timezone ? DATE_HINT_ID : undefined}
        />
        {timezone && (
          <div id={DATE_HINT_ID} className="form-text">
            {`Horários no fuso da empresa: ${timezone}`}
          </div>
        )}
      </div>

      <div className="booking-slots" aria-busy={isLoading}>
        {isLoading && <LoadingState label="A consultar horários…" />}

        {!isLoading && errorMessage && (
          <ErrorState message={errorMessage} onRetry={onRetry} />
        )}

        {!isLoading && !errorMessage && slots.length === 0 && (
          <EmptyState
            title="Sem horários disponíveis"
            description={BOOKING_NO_SLOTS_MESSAGE}
          />
        )}

        {!isLoading && !errorMessage && slots.length > 0 && (
          <>
            <div className="booking-slots-header">
              <h4 className="booking-slots-title">
                {slots.length === 1
                  ? "1 horário disponível"
                  : `${slots.length} horários disponíveis`}
              </h4>
            </div>
            <div
              className="booking-slots-grid"
              role="group"
              aria-label="Horários disponíveis"
            >
              {slots.map((slot) => {
                const key = getSlotKey(slot);
                const isSelected = selectedSlot?.startAt === slot.startAt;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`booking-slot${isSelected ? " is-selected" : ""}`}
                    aria-pressed={isSelected}
                    onClick={() => onSelectSlot(slot)}
                  >
                    {formatSlotTime(slot.startAt, timezone)}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}