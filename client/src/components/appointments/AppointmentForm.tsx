import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import availabilityApi from "../../api/endpoints/availability.api";
import appointmentsApi from "../../api/endpoints/appointments.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import AppointmentCalendar from "./AppointmentCalendar";
import AvailableTimeSlots from "./AvailableTimeSlots";
import {
  APPOINTMENT_TIMEZONE,
  formatAppointmentEndTime,
  formatAppointmentTime,
  formatWeekdayDate,
  toIsoUtc,
  toLocalDateTimeInputValue,
} from "../../config/appointmentTime";
import { getAvailableSlots } from "../../config/appointmentSlots";
import type { Appointment } from "../../types/appointment";
import type { Availability } from "../../types/availability";
import type { Client } from "../../types/client";
import type { Service } from "../../types/service";
import type { Employee } from "../../types/employee";

interface FieldErrors {
  clientId?: string;
  serviceId?: string;
  employeeId?: string;
  startAt?: string;
}

interface AppointmentFormProps {
  isOpen: boolean;
  appointment: Appointment | null;
  clients: Client[];
  services: Service[];
  employees: Employee[];
  /** Agendamentos da empresa usados para calcular conflitos de funcionário. */
  appointments: Appointment[];
  onClose: () => void;
  onSaved: (appointment: Appointment) => void;
  /** Chamado quando o backend retorna 409 (conflito/race) para recarregar a lista. */
  onConflict?: () => void;
  /**
   * Timezone da empresa (IANA). Quando omitido, usa o mesmo padrão do backend
   * (Europe/Lisbon). O componente é puro: quem resolve o timezone real é a
   * página, a partir da empresa carregada na sessão (Redux).
   */
  timezone?: string;
}

function validate(
  clientId: string,
  serviceId: string,
  employeeId: string,
  startAt: string,
): FieldErrors {
  const errors: FieldErrors = {};

  if (!clientId) {
    errors.clientId = "O cliente é obrigatório.";
  }

  if (!serviceId) {
    errors.serviceId = "O serviço é obrigatório.";
  }

  if (!employeeId) {
    errors.employeeId = "O funcionário é obrigatório.";
  }

  if (!startAt) {
    errors.startAt = "A data e hora do agendamento são obrigatórias.";
  } else if (!toIsoUtc(startAt)) {
    errors.startAt = "A data e hora do agendamento são inválidas.";
  }

  return errors;
}

/**
 * Garante que o valor selecionado no formulário de edição continue existindo na
 * lista mesmo que o cliente/serviço tenha sido desativado depois do
 * agendamento (o backend mantém a referência atual se ela não for alterada).
 */
function includeCurrent<T extends { id: string }>(
  currentId: string,
  active: T[],
  source: T[],
): T[] {
  if (!currentId || active.some((item) => item.id === currentId)) {
    return active;
  }
  const item = source.find((candidate) => candidate.id === currentId);
  return item ? [item, ...active] : active;
}

export default function AppointmentForm({
  isOpen,
  appointment,
  clients,
  services,
  employees,
  appointments,
  onClose,
  onSaved,
  onConflict,
  timezone = APPOINTMENT_TIMEZONE,
}: AppointmentFormProps) {
  const isEdit = Boolean(appointment);

  const [clientId, setClientId] = useState(appointment?.clientId ?? "");
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? "");
  const [employeeId, setEmployeeId] = useState(appointment?.employeeId ?? "");
  const [startAt, setStartAt] = useState(
    appointment ? toLocalDateTimeInputValue(appointment.startAt) : "",
  );
  const [notes, setNotes] = useState(appointment?.notes ?? "");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Agenda inteligente
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(false);
  const [availabilityError, setAvailabilityError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(
    appointment ? toLocalDateTimeInputValue(appointment.startAt).slice(0, 10) : null,
  );
  const [selectedSlotStart, setSelectedSlotStart] = useState<string | null>(
    appointment?.startAt ?? null,
  );
  const previousEmployeeRef = useRef(employeeId);

  const clientOptions = useMemo(
    () => includeCurrent(appointment?.clientId ?? "", clients.filter((c) => c.isActive), clients),
    [appointment?.clientId, clients],
  );
  const serviceOptions = useMemo(
    () => includeCurrent(appointment?.serviceId ?? "", services.filter((s) => s.isActive), services),
    [appointment?.serviceId, services],
  );
  const employeeOptions = useMemo(
    () =>
      includeCurrent(
        appointment?.employeeId ?? "",
        employees.filter((employee) => employee.role !== "CLIENT"),
        employees,
      ),
    [appointment?.employeeId, employees],
  );

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId) ?? null,
    [services, serviceId],
  );

  const slotsForDay = useMemo(() => {
    if (!employeeId || !selectedDate) {
      return [];
    }
    if (!selectedService || selectedService.duration <= 0) {
      return [];
    }
    return getAvailableSlots({
      dateKey: selectedDate,
      timezone,
      employeeId,
      availability,
      durationMinutes: selectedService.duration,
      appointments,
      excludeAppointmentId: appointment?.id,
    });
  }, [
    employeeId,
    selectedDate,
    selectedService,
    availability,
    appointments,
    appointment?.id,
    timezone,
  ]);

  const currentSlotLabel = useMemo(() => {
    if (!isEdit || !appointment || !selectedDate) {
      return null;
    }
    if (slotsForDay.some((slot) => slot.start === appointment.startAt)) {
      return null;
    }
    return `${formatAppointmentTime(appointment.startAt, timezone)} (horário atual do agendamento)`;
  }, [isEdit, appointment, slotsForDay, selectedDate, timezone]);

  const endTimePreview =
    serviceId && selectedService
      ? formatAppointmentEndTime(startAt, selectedService.duration, timezone)
      : "";

  const loadAvailability = useCallback(async (employeeIdToLoad: string) => {
    setIsLoadingAvailability(true);
    setAvailabilityError(null);
    try {
      const response = await availabilityApi.getEmployeeAvailabilities(employeeIdToLoad);
      setAvailability(response.data ?? []);
    } catch (error) {
      const failure = getApiError(error);
      setAvailabilityError(getFriendlyErrorMessage(failure));
      setAvailability([]);
    } finally {
      setIsLoadingAvailability(false);
    }
  }, []);

  useEffect(() => {
    if (!employeeId) {
      setAvailability([]);
      setAvailabilityError(null);
      return;
    }
    // Ao trocar de funcionário: limpar data/slot/horário selecionados e
    // recarregar a disponibilidade semanal + os agendamentos conflitantes.
    if (previousEmployeeRef.current !== employeeId) {
      setSelectedDate(null);
      setSelectedSlotStart(null);
      setStartAt("");
    }
    previousEmployeeRef.current = employeeId;
    void loadAvailability(employeeId);
  }, [employeeId, loadAvailability]);

  function handleSelectDay(dateKey: string) {
    setSelectedDate(dateKey);
    setSelectedSlotStart(null);
    setStartAt("");
  }

  function handleSelectSlot(start: string) {
    setSelectedSlotStart(start);
    setStartAt(toLocalDateTimeInputValue(start, timezone));
  }

  function handleServiceChange(value: string) {
    if (value === serviceId) {
      return;
    }
    setServiceId(value);

    // Recalcular os slots; se a seleção atual deixar de ser válida (serviço
    // com duração diferente), limpar o horário para obrigar nova escolha.
    const service = services.find((candidate) => candidate.id === value);
    if (service && employeeId && selectedDate && selectedSlotStart) {
      const slots = getAvailableSlots({
        dateKey: selectedDate,
        timezone,
        employeeId,
        availability,
        durationMinutes: service.duration,
        appointments,
        excludeAppointmentId: appointment?.id,
      });
      if (!slots.some((slot) => slot.start === selectedSlotStart)) {
        setSelectedSlotStart(null);
        setStartAt("");
      }
    }
  }

  function handleClose() {
    onClose();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    const errors = validate(clientId, serviceId, employeeId, startAt);
    setFieldErrors(errors);

    if (errors.clientId || errors.serviceId || errors.employeeId || errors.startAt) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        clientId,
        serviceId,
        employeeId,
        startAt: toIsoUtc(startAt),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };
      const response = isEdit
        ? await appointmentsApi.updateAppointment(appointment!.id, payload)
        : await appointmentsApi.createAppointment(payload);
      const saved = response.data;
      if (saved) {
        onSaved(saved);
      }
      handleClose();
    } catch (error) {
      const failure = getApiError(error);
      setErrorMessage(getFriendlyErrorMessage(failure));
      setIsSubmitting(false);
      if (failure.kind === "conflict") {
        // Race condition/ocupação paralela: recarregar a lista para que o
        // slot conflitante deixe de aparecer e outro possa ser escolhido.
        onConflict?.();
      }
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal show d-block" role="dialog" aria-modal="true">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title h5">
              {isEdit ? "Editar agendamento" : "Novo agendamento"}
            </h2>
            <button
              type="button"
              className="btn-close"
              aria-label="Fechar"
              onClick={handleClose}
            />
          </div>

          <div className="modal-body">
            {errorMessage && (
              <div className="alert alert-danger" role="alert">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="appointment-client" className="form-label">
                    Cliente
                  </label>
                  <select
                    id="appointment-client"
                    className={`form-select ${fieldErrors.clientId ? "is-invalid" : ""}`}
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                  >
                    <option value="">Selecione o cliente</option>
                    {clientOptions.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                        {client.isActive ? "" : " (inativo)"}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.clientId && (
                    <div className="invalid-feedback">{fieldErrors.clientId}</div>
                  )}
                </div>

                <div className="col-md-6 mb-3">
                  <label htmlFor="appointment-service" className="form-label">
                    Serviço
                  </label>
                  <select
                    id="appointment-service"
                    className={`form-select ${fieldErrors.serviceId ? "is-invalid" : ""}`}
                    value={serviceId}
                    onChange={(event) => handleServiceChange(event.target.value)}
                  >
                    <option value="">Selecione o serviço</option>
                    {serviceOptions.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                        {service.isActive ? "" : " (inativo)"}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.serviceId && (
                    <div className="invalid-feedback">{fieldErrors.serviceId}</div>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <label htmlFor="appointment-employee" className="form-label">
                  Funcionário
                </label>
                <select
                  id="appointment-employee"
                  className={`form-select ${fieldErrors.employeeId ? "is-invalid" : ""}`}
                  value={employeeId}
                  onChange={(event) => setEmployeeId(event.target.value)}
                >
                  <option value="">Selecione o funcionário</option>
                  {employeeOptions.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name}
                      {employee.role === "CLIENT" ? " (sem perfil de funcionário)" : ""}
                    </option>
                  ))}
                </select>
                {fieldErrors.employeeId && (
                  <div className="invalid-feedback">{fieldErrors.employeeId}</div>
                )}
              </div>

              <div className="mb-3">
                <span className="form-label d-block">Agenda do funcionário</span>

                {fieldErrors.startAt && (
                  <div className="alert alert-danger py-2" role="alert">
                    {fieldErrors.startAt}
                  </div>
                )}

                {!employeeId && (
                  <p className="text-muted mb-0">
                    Selecione um funcionário para ver a disponibilidade.
                  </p>
                )}

                {employeeId && isLoadingAvailability && (
                  <div className="d-flex align-items-center gap-2 text-muted" role="status">
                    <span className="spinner-border spinner-border-sm" aria-hidden="true" />
                    <span className="visually-hidden">Carregando...</span>
                    <span>Carregando disponibilidade...</span>
                  </div>
                )}

                {employeeId && !isLoadingAvailability && availabilityError && (
                  <div className="alert alert-danger py-2" role="alert">
                    {availabilityError}
                    <div className="mt-2">
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() => void loadAvailability(employeeId)}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  </div>
                )}

                {employeeId &&
                  !isLoadingAvailability &&
                  !availabilityError &&
                  availability.length === 0 && (
                    <p className="text-muted mb-0">
                      Este funcionário não possui disponibilidade cadastrada.
                    </p>
                  )}

                {employeeId &&
                  !isLoadingAvailability &&
                  !availabilityError &&
                  availability.length > 0 && (
                    <>
                      <AppointmentCalendar
                        key={employeeId}
                        availability={availability}
                        selectedDate={selectedDate}
                        onSelectDay={handleSelectDay}
                      />

                      <div className="mt-3">
                        {!serviceId && (
                          <p className="text-muted mb-0">
                            Selecione um serviço para visualizar os horários.
                          </p>
                        )}

                        {serviceId && !selectedDate && (
                          <p className="text-muted mb-0">
                            Selecione um dia para ver os horários.
                          </p>
                        )}

                        {serviceId && selectedDate && (
                          <>
                            <div className="mb-1">
                              <span className="fw-semibold">
                                {formatWeekdayDate(selectedDate, timezone)}
                              </span>
                            </div>
                            <span className="form-label d-block">Horários disponíveis</span>
                            <AvailableTimeSlots
                              slots={slotsForDay}
                              selectedStart={selectedSlotStart}
                              onSelect={handleSelectSlot}
                              currentLabel={currentSlotLabel}
                            />
                            {endTimePreview && (
                              <div className="form-text">
                                O agendamento termina às {endTimePreview} (horário
                                local da empresa, calculado pelo backend).
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </>
                  )}
              </div>

              <div className="mb-3">
                <label htmlFor="appointment-notes" className="form-label">
                  Observações
                </label>
                <textarea
                  id="appointment-notes"
                  className="form-control"
                  rows={3}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>

              <div className="modal-footer px-0 pb-0 d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm me-1"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting
                    ? isEdit
                      ? "Salvando..."
                      : "Criando..."
                    : isEdit
                      ? "Salvar"
                      : "Criar agendamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}