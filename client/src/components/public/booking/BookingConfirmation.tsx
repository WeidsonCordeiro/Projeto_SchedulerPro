import { Link } from "react-router-dom";
import {
  formatBookingDate,
  formatBookingPrice,
  formatSlotTime,
} from "../../../config/publicBooking";
import type { PublicAvailabilitySlot } from "../../../types/publicBooking";
import type { PublicService } from "../../../types/publicBooking";
import type { PublicAppointment } from "../../../types/publicAppointment";

interface BookingConfirmationProps {
  appointment: PublicAppointment;
  service: PublicService;
  slot: PublicAvailabilitySlot;
  timezone: string;
  publicAccessToken: string;
  onRestart: () => void;
}

/**
 * Ecrã final: o agendamento ficou criado.
 *
 * O `publicAccessToken` é usado para montar o link de gestão e NÃO é
 * guardado em lado nenhum (nem `localStorage`, nem `sessionStorage`, nem
 * cookies, nem IndexedDB). O backend guarda apenas o hash; este é o único
 * momento em que o valor puro existe no browser, e destruí-lo com o ecrã é o
 * que impede que fique acessível a um script de outra origem.
 *
 * O link gerido por este token é o mesmo `/agendar/:token` da Parte 3 —
 * reutiliza a página de gestão já escrita e testada, sem duplicar código.
 */
export default function BookingConfirmation({
  appointment,
  service,
  slot,
  timezone,
  publicAccessToken,
  onRestart,
}: BookingConfirmationProps) {
  const managePath = `/agendar/${encodeURIComponent(publicAccessToken)}`;

  return (
    <section className="booking-section" aria-labelledby="booking-done-title">
      <h3 id="booking-done-title" className="booking-section-title">
        Agendamento confirmado
      </h3>
      <p className="text-muted">
        O agendamento ficou registado. Guarde o link abaixo para consultar ou
        alterar.
      </p>

      <dl className="booking-review-list">
        <dt>Serviço</dt>
        <dd>
          {service.name}
          <span className="booking-review-meta">
            {` · ${formatBookingPrice(service.price)}`}
          </span>
        </dd>

        <dt>Profissional</dt>
        <dd>{appointment.employee.name}</dd>

        <dt>Data e hora</dt>
        <dd>
          {formatBookingDate(slot.startAt, timezone)}
          <span className="booking-review-meta">
            {` às ${formatSlotTime(slot.startAt, timezone)}`}
          </span>
        </dd>
      </dl>

      <div className="booking-manage">
        <h4 className="booking-slots-title">Link para gerir este agendamento</h4>
        <p className="text-muted booking-manage-hint">
          É a única forma de consultar, alterar ou cancelar este agendamento.
          Guarde-o agora — não será possível recuperá-lo depois.
        </p>
        <Link className="btn btn-outline-primary booking-manage-link" to={managePath}>
          Abrir agendamento
        </Link>
      </div>

      <button type="button" className="btn btn-link" onClick={onRestart}>
        Fazer novo agendamento
      </button>
    </section>
  );
}