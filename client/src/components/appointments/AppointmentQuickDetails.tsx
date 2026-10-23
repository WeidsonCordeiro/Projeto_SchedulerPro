import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  formatAppointmentDate,
  formatAppointmentTime,
} from "../../config/appointmentTime";
import {
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";
import { formatBookingPrice } from "../../config/publicBooking";
import type { Appointment } from "../../types/appointment";
import { computePopoverPosition } from "./computePopoverPosition";

function isMeaningfulLabel(value: string | undefined): boolean {
  return Boolean(value && value.trim() !== "" && value !== "—");
}

export interface AppointmentQuickDetailsProps {
  appointment: Appointment;
  clientName: string;
  serviceName: string;
  employeeName?: string;
  servicePrice?: number;
  timezone: string;
  anchorRect: DOMRect | null;
  isMobilePanel: boolean;
  onClose: () => void;
}

function QuickDetailsBody({
  appointment,
  clientName,
  serviceName,
  employeeName,
  servicePrice,
  timezone,
  titleId,
}: Omit<AppointmentQuickDetailsProps, "anchorRect" | "isMobilePanel" | "onClose"> & {
  titleId: string;
}) {
  const dateLabel = formatAppointmentDate(appointment.startAt, timezone);
  const startLabel = formatAppointmentTime(appointment.startAt, timezone);
  const endLabel = formatAppointmentTime(appointment.endAt, timezone);
  const statusLabel = APPOINTMENT_STATUS_LABELS[appointment.status];

  return (
    <div className="appointment-quick-details-body">
      <h2 id={titleId} className="h6 mb-3">
        Detalhes do agendamento
      </h2>
      <dl className="appointment-quick-details-fields mb-0">
        <div className="appointment-quick-details-row">
          <dt>Cliente</dt>
          <dd>{clientName}</dd>
        </div>
        {isMeaningfulLabel(serviceName) && (
          <div className="appointment-quick-details-row">
            <dt>Serviço</dt>
            <dd>{serviceName}</dd>
          </div>
        )}
        <div className="appointment-quick-details-row">
          <dt>Data e hora</dt>
          <dd>
            {dateLabel} · {startLabel} – {endLabel}
          </dd>
        </div>
        {isMeaningfulLabel(employeeName) && (
          <div className="appointment-quick-details-row">
            <dt>Funcionário</dt>
            <dd>{employeeName}</dd>
          </div>
        )}
        <div className="appointment-quick-details-row">
          <dt>Estado</dt>
          <dd>
            <span
              className={`badge ${APPOINTMENT_STATUS_BADGE_CLASS[appointment.status]}`}
            >
              {statusLabel}
            </span>
          </dd>
        </div>
        {servicePrice != null && Number.isFinite(servicePrice) && (
          <div className="appointment-quick-details-row">
            <dt>Preço</dt>
            <dd>{formatBookingPrice(servicePrice)} €</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

export default function AppointmentQuickDetails({
  appointment,
  clientName,
  serviceName,
  employeeName,
  servicePrice,
  timezone,
  anchorRect,
  isMobilePanel,
  onClose,
}: AppointmentQuickDetailsProps) {
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(
    null,
  );

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, [appointment.id, isMobilePanel]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useLayoutEffect(() => {
    if (isMobilePanel || !anchorRect || !panelRef.current) {
      setCoords(null);
      return;
    }
    const rect = panelRef.current.getBoundingClientRect();
    setCoords(
      computePopoverPosition(anchorRect, {
        width: rect.width,
        height: rect.height,
      }),
    );
  }, [anchorRect, isMobilePanel, appointment.id]);

  const stopBubble = (event: React.MouseEvent | React.SyntheticEvent) => {
    event.stopPropagation();
  };

  if (isMobilePanel) {
    return createPortal(
      <div
        className="appointment-quick-details-modal modal show d-block"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={stopBubble}
        onClick={stopBubble}
      >
        <div
          className="modal-backdrop show"
          aria-hidden="true"
          onClick={onClose}
        />
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header py-2">
              <button
                ref={closeButtonRef}
                type="button"
                className="btn-close ms-auto"
                aria-label="Fechar"
                onClick={onClose}
              />
            </div>
            <div className="modal-body pt-0">
              <QuickDetailsBody
                appointment={appointment}
                clientName={clientName}
                serviceName={serviceName}
                employeeName={employeeName}
                servicePrice={servicePrice}
                timezone={timezone}
                titleId={titleId}
              />
            </div>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  const style =
    coords != null
      ? { top: coords.top, left: coords.left }
      : { top: anchorRect?.bottom ?? 0, left: anchorRect?.left ?? 0, visibility: "hidden" as const };

  return createPortal(
    <>
      <div
        className="appointment-quick-details-backdrop"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="appointment-quick-details-popover card shadow"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={style}
        onMouseDown={stopBubble}
        onClick={stopBubble}
      >
        <div className="card-body position-relative">
          <button
            ref={closeButtonRef}
            type="button"
            className="btn-close appointment-quick-details-close"
            aria-label="Fechar"
            onClick={onClose}
          />
          <QuickDetailsBody
            appointment={appointment}
            clientName={clientName}
            serviceName={serviceName}
            employeeName={employeeName}
            servicePrice={servicePrice}
            timezone={timezone}
            titleId={titleId}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}
