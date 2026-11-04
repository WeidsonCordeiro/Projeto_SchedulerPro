import ImageAvatar from "../../common/ImageAvatar";
import {
  formatBookingDate,
  formatBookingPrice,
  formatBookingDuration,
  formatSlotTime,
  toBookingAvatarImage,
} from "../../../config/publicBooking";
import type { ClientDetailsInput } from "../../../config/publicBooking";
import type {
  PublicAvailabilitySlot,
  PublicEmployee,
  PublicService,
} from "../../../types/publicBooking";

interface BookingReviewProps {
  service: PublicService;
  employee: PublicEmployee;
  slot: PublicAvailabilitySlot;
  timezone: string;
  details: ClientDetailsInput;
  isSubmitting: boolean;
  submitError: string | null;
  onConfirm: () => void;
  onBack: () => void;
}

/**
 * Revisão antes de criar o agendamento.
 *
 * Existe por um motivo prático: o POST é irreversível do ponto de vista do
 * cliente final — não há e-mail nem "desfazer" — e os campos não editáveis
 * (`endAt`, `status`, `price`) são decididos pelo servidor. Ver tudo num ecrã
 * só, com o preço e a hora que o backend vai usar, é a última
 * oportunidade de o utilizador detetar que escolheu o dia errado.
 */
export default function BookingReview({
  service,
  employee,
  slot,
  timezone,
  details,
  isSubmitting,
  submitError,
  onConfirm,
  onBack,
}: BookingReviewProps) {
  return (
    <section className="booking-section" aria-labelledby="booking-review-title">
      <h3 id="booking-review-title" className="booking-section-title">
        Rever e confirmar
      </h3>
      <p className="text-muted">
        Verifique os dados antes de confirmar.
      </p>

      <dl className="booking-review-list">
        <dt>Serviço</dt>
        <dd>
          {service.name}
          <span className="booking-review-meta">
            {` · ${formatBookingDuration(service.durationMinutes)} · ${formatBookingPrice(service.price)}`}
          </span>
        </dd>

        <dt>Profissional</dt>
        <dd className="booking-review-person">
          <ImageAvatar
            image={toBookingAvatarImage(employee.avatarUrl)}
            name={employee.name}
            size="sm"
            shape="circle"
          />
          {employee.name}
        </dd>

        <dt>Data e hora</dt>
        <dd>
          {formatBookingDate(slot.startAt, timezone)}
          <span className="booking-review-meta">
            {` às ${formatSlotTime(slot.startAt, timezone)}`}
          </span>
        </dd>

        <dt>Nome</dt>
        <dd>{details.clientName}</dd>

        <dt>E-mail</dt>
        <dd>{details.clientEmail}</dd>

        {details.clientPhone && (
          <>
            <dt>Telefone</dt>
            <dd>{details.clientPhone}</dd>
          </>
        )}

        {details.notes && (
          <>
            <dt>Observações</dt>
            <dd>{details.notes}</dd>
          </>
        )}
      </dl>

      {submitError && (
        <div className="alert alert-danger" role="alert">
          {submitError}
        </div>
      )}

      <div className="d-flex flex-column flex-sm-row gap-2">
        <button
          type="button"
          className="btn btn-primary flex-grow-1"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting && (
            <span
              className="spinner-border spinner-border-sm me-2"
              aria-hidden="true"
            />
          )}
          {isSubmitting ? "A confirmar…" : "Confirmar agendamento"}
        </button>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={onBack}
          disabled={isSubmitting}
        >
          Voltar
        </button>
      </div>
    </section>
  );
}