import ImageAvatar from "../common/ImageAvatar";
import { APPOINTMENT_STATUS_BADGE_CLASS, APPOINTMENT_STATUS_LABELS } from "../../config/appointmentStatus";
import { formatAppointmentDate } from "../../config/appointmentTime";
import {
  getPublicAppointmentPeriod,
  toPublicAvatarImage,
} from "../../config/publicAppointment";
import type { PublicAppointment } from "../../types/publicAppointment";

interface PublicAppointmentSummaryProps {
  appointment: PublicAppointment;
}

/**
 * Resumo do agendamento: serviço, profissional, data, horário e estado.
 *
 * Só leitura e só apresentação. Não conhece o token, não faz pedidos e não
 * decide o que é alterável — quem sabe disso é a página que a orquestra.
 *
* Os rótulos são `<dt>`/`<dd>` reais, para que uma tecnologia assistiva
 * associe cada valor ao seu campo em vez de devolver uma sequência de texto
 * solto.
 */
export default function PublicAppointmentSummary({
  appointment,
}: PublicAppointmentSummaryProps) {
  const { employee, service, status } = appointment;

  return (
    <dl className="public-summary mb-0">
      <div className="public-summary-row">
        <dt>Serviço</dt>
        <dd>{service.name}</dd>
      </div>

      <div className="public-summary-row">
        <dt>Profissional</dt>
        <dd>
          <span className="person-cell">
            <ImageAvatar
              image={toPublicAvatarImage(employee.avatarUrl)}
              name={employee.name}
              size="sm"
              shape="circle"
              // Decorativa: o nome é apresentado em texto ao lado da imagem.
              alt=""
            />
            <span>{employee.name}</span>
          </span>
        </dd>
      </div>

      <div className="public-summary-row">
        <dt>Data</dt>
      <dd>{formatAppointmentDate(appointment.startAt, appointment.timezone)}</dd>
      </div>

      <div className="public-summary-row">
        <dt>Horário</dt>
        <dd>{getPublicAppointmentPeriod(appointment)}</dd>
      </div>

      <div className="public-summary-row">
        <dt>Estado</dt>
        <dd>
          <span className={`badge ${APPOINTMENT_STATUS_BADGE_CLASS[status]}`}>
            {APPOINTMENT_STATUS_LABELS[status]}
          </span>
        </dd>
      </div>
    </dl>
  );
}
