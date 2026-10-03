import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import PageHeader from "../../components/common/PageHeader";
import EmptyState from "../../components/common/EmptyState";
import ErrorState from "../../components/common/ErrorState";
import LoadingState from "../../components/common/LoadingState";
import BookingClientDetailsForm from "../../components/public/booking/BookingClientDetailsForm";
import BookingConfirmation from "../../components/public/booking/BookingConfirmation";
import BookingDateTimePicker from "../../components/public/booking/BookingDateTimePicker";
import BookingEmployeePicker from "../../components/public/booking/BookingEmployeePicker";
import BookingProgressSteps from "../../components/public/booking/BookingProgressSteps";
import type { BookingStepId } from "../../components/public/booking/BookingProgressSteps";
import BookingReview from "../../components/public/booking/BookingReview";
import BookingServicePicker from "../../components/public/booking/BookingServicePicker";
import publicBookingApi from "../../api/endpoints/publicBooking.api";
import { getApiError } from "../../api/errors";
import {
  BOOKING_NO_EMPLOYEES_MESSAGE,
  BOOKING_NO_SERVICES_MESSAGE,
  BOOKING_SLOT_TAKEN_MESSAGE,
  buildBookingPayload,
  getBookingErrorMessage,
  getTodayDateKey,
  isValidDateKey,
} from "../../config/publicBooking";
import type { ClientDetailsInput } from "../../config/publicBooking";
import type { PublicAppointment } from "../../types/publicAppointment";
import type {
  PublicAvailability,
  PublicAvailabilitySlot,
  PublicEmployee,
  PublicService,
} from "../../types/publicBooking";

interface CatalogResource<T> {
  items: T[];
  isLoading: boolean;
  errorMessage: string | null;
}

interface Confirmation {
  appointment: PublicAppointment;
  service: PublicService;
  slot: PublicAvailabilitySlot;
  timezone: string;
  publicAccessToken: string;
}

const EMPTY_CATALOG = { items: [], isLoading: false, errorMessage: null };

const EMPTY_DETAILS: ClientDetailsInput = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  notes: "",
};

/**
 * Página pública de NOVO agendamento: `/agendar/empresa/:companyId`.
 *
 * Sem `AppLayout`, sem `Navbar`, sem `ProtectedRoute`: quem chega aqui não tem
 * sessão e nunca deve ser levado a um ecrã de login. O `companyId` vem da URL e
 * é a única forma de identificar a empresa — não é lido de Redux, nem de
 * query, nem enviado no corpo do POST.
 *
 * A página é um orquestrador: decide quando pedir o quê e o que fazer com um
 * 409. Os componentes de cada etapa são burros por desenho — recebem estado e
 * devolvem intenção.
 */
export default function PublicBookingPage() {
  const { companyId } = useParams<{ companyId: string }>();

  const [step, setStep] = useState<BookingStepId>("service");
  const [services, setServices] = useState<CatalogResource<PublicService>>(
    EMPTY_CATALOG,
  );
  const [employees, setEmployees] = useState<CatalogResource<PublicEmployee>>(
    EMPTY_CATALOG,
  );

  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);

  const [date, setDate] = useState(() => getTodayDateKey());
  const [userPickedDate, setUserPickedDate] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<PublicAvailabilitySlot | null>(
    null,
  );
  const [availability, setAvailability] = useState<PublicAvailability | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [availabilityRefresh, setAvailabilityRefresh] = useState(0);

  const [details, setDetails] = useState<ClientDetailsInput>(EMPTY_DETAILS);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusHeading = useRef(false);

  const timezone = availability?.timezone ?? null;
  const minDate = getTodayDateKey(timezone ?? undefined);

  /* ---------------------------------------------------------------- */
  /* Catálogo                                                          */
  /* ---------------------------------------------------------------- */

  const loadServices = useCallback(() => {
    if (!companyId) {
      return;
    }
    setServices({ items: [], isLoading: true, errorMessage: null });
    publicBookingApi
      .getServices(companyId)
      .then((response) => {
        setServices({
          items: response,
          isLoading: false,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        setServices({
          items: [],
          isLoading: false,
          errorMessage: getBookingErrorMessage(getApiError(error)),
        });
      });
  }, [companyId]);

  const loadEmployees = useCallback(() => {
    if (!companyId) {
      return;
    }
    setEmployees({ items: [], isLoading: true, errorMessage: null });
    publicBookingApi
      .getEmployees(companyId)
      .then((response) => {
        setEmployees({
          items: response,
          isLoading: false,
          errorMessage: null,
        });
      })
      .catch((error: unknown) => {
        setEmployees({
          items: [],
          isLoading: false,
          errorMessage: getBookingErrorMessage(getApiError(error)),
        });
      });
  }, [companyId]);

  /**
   * Serviços e profissionais carregam em PARALELO, e não em cadeia.
   *
   * A sugestão obviousia-se de pedir os profissionais só depois de escolher
   * o serviço, mas não há relação serviço × profissional (Part 4): a lista não
   * depende da escolha. Pedir os dois ao entrar evita o ecrã "a carregar
   * profissionais" no meio do fluxo, e o custo é uma chamada que uma visita
   * abandonada na etapa 1 não fez.
   */
  useEffect(() => {
    loadServices();
    loadEmployees();
  }, [loadServices, loadEmployees]);

  /* ---------------------------------------------------------------- */
  /* Disponibilidade                                                   */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (
      !companyId ||
      !selectedServiceId ||
      !selectedEmployeeId ||
      !isValidDateKey(date)
    ) {
      setAvailability(null);
      return;
    }

    // Descartar a resposta se as entradas mudaram enquanto o pedido corria:
    // sem isto, o utilizador que muda de dia depressa vê os horários do dia
    // anterior por baixo dos do novo.
    let cancelled = false;
    setIsLoadingSlots(true);
    setSlotsError(null);

    publicBookingApi
      .getAvailability(companyId, {
        serviceId: selectedServiceId,
        employeeId: selectedEmployeeId,
        date,
      })
      .then((response) => {
        if (cancelled) {
          return;
        }
        setAvailability(response);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setAvailability(null);
        setSlotsError(getBookingErrorMessage(getApiError(error)));
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    companyId,
    selectedServiceId,
    selectedEmployeeId,
    date,
    availabilityRefresh,
  ]);

  /**
   * Ajusta o dia inicial ao fuso da empresa, uma vez conhecido.
   *
   * A empresa pode estar noutro dia: às 23:30 em Lisboa, no Brasil já é o dia
   * seguinte. Antes da primeira resposta de disponibilidade não há forma de
   * saber o fuso (os endpoints de catálogo não o trazem), por isso o campo
   * arranca no dia do browser e é corrigido aqui.
   *
   * Só mexe se o utilizador ainda NÃO escolheu uma data: se já escolheu,
   * mudar-lhe a data por baixo dos dedos seria pior do que a imprecisão.
   */
  useEffect(() => {
    if (!timezone || userPickedDate) {
      return;
    }
    const todayInZone = getTodayDateKey(timezone);
    if (todayInZone && todayInZone !== date) {
      setDate(todayInZone);
    }
  }, [timezone, userPickedDate, date]);

  /* ---------------------------------------------------------------- */
  /* Foco entre etapas                                                 */
  /* ---------------------------------------------------------------- */

  /**
   * Muda de etapa e arma o foco para o novo título.
   *
   * A troca de etapa substitui o conteúdo inteiro, e com ele o elemento focado.
   * Sem repôr o foco, quem navegou por teclado até "Continuar" fica a interagir
   * com um nó que já não existe e o leitor de ecrã não anuncia a mudança.
   * Passa pelo título, que nomeia a etapa sem lançar o utilizador numa caixa de
   * escrita.
   */
  function goToStep(next: BookingStepId) {
    shouldFocusHeading.current = true;
    setStep(next);
  }

  useEffect(() => {
    if (shouldFocusHeading.current) {
      shouldFocusHeading.current = false;
      headingRef.current?.focus();
    }
  }, [step]);

  /* ---------------------------------------------------------------- */
  /* Seleções                                                          */
  /* ---------------------------------------------------------------- */

  function handleSelectService(serviceId: string) {
    setSelectedServiceId(serviceId);
    // O serviço entra na chave da disponibilidade, logo o horário escolhido
    // deixa de valer. O profissional NÃO é limpo: a lista não depende do
    // serviço e apagar a escolha seria trabalho a mais sem motivo.
    setSelectedSlot(null);
    setSubmitError(null);
  }

  function handleSelectEmployee(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setSelectedSlot(null);
    setSubmitError(null);
    goToStep("schedule");
  }

  function handleDateChange(next: string) {
    setUserPickedDate(true);
    setDate(next);
    setSelectedSlot(null);
    setSubmitError(null);
  }

  function handleSelectSlot(slot: PublicAvailabilitySlot) {
    setSelectedSlot(slot);
    setSubmitError(null);
  }

  /* ---------------------------------------------------------------- */
  /* Submissão                                                         */
  /* ---------------------------------------------------------------- */

  async function handleConfirm() {
    if (!companyId || !selectedServiceId || !selectedEmployeeId || !selectedSlot) {
      return;
    }
    const service = services.items.find(
      (item) => item.id === selectedServiceId,
    );
    if (!service || !availability) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await publicBookingApi.createAppointment(
        companyId,
        buildBookingPayload(
          {
            serviceId: selectedServiceId,
            employeeId: selectedEmployeeId,
            startAt: selectedSlot.startAt,
          },
          details,
        ),
      );

      setConfirmation({
        appointment: response.appointment,
        service,
        slot: selectedSlot,
        timezone: availability.timezone,
        publicAccessToken: response.publicAccessToken,
      });
      shouldFocusHeading.current = true;
    } catch (error: unknown) {
      const failure = getApiError(error);

      if (failure.status === 409) {
        // O horário desapareceu entre a leitura e a escrita. Volta à etapa da
        // data, mantém o que já estava escrito e volta a listar horários —
        // reenviar o MESMO pedido só repetiria o 409.
        setSubmitError(BOOKING_SLOT_TAKEN_MESSAGE);
        setSelectedSlot(null);
        setAvailabilityRefresh((value) => value + 1);
        goToStep("schedule");
      } else {
        setSubmitError(getBookingErrorMessage(failure));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleRestart() {
    setConfirmation(null);
    setSelectedServiceId(null);
    setSelectedEmployeeId(null);
    setSelectedSlot(null);
    setAvailability(null);
    setDetails(EMPTY_DETAILS);
    setDate(getTodayDateKey());
    setUserPickedDate(false);
    setSubmitError(null);
    goToStep("service");
  }

  /* ---------------------------------------------------------------- */
  /* Derivados                                                         */
  /* ---------------------------------------------------------------- */

  const selectedService = useMemo(
    () => services.items.find((item) => item.id === selectedServiceId) ?? null,
    [services.items, selectedServiceId],
  );
  const selectedEmployee = useMemo(
    () => employees.items.find((item) => item.id === selectedEmployeeId) ?? null,
    [employees.items, selectedEmployeeId],
  );
  const slots = availability?.slots ?? [];

  const canContinueFromSchedule = selectedSlot !== null;

  /* ---------------------------------------------------------------- */
  /* Ecrã                                                              */
  /* ---------------------------------------------------------------- */

  return (
    <div className="public-shell">
      <div className="public-brand">
        <span className="brand-mark" aria-hidden="true">
          S
        </span>
        <span>SchedulerPro</span>
      </div>

      <main className="public-content public-booking">
        <PageHeader
          title="Marcar atendimento"
          description="Escolha o serviço, o profissional e o horário. Não precisa de conta."
        />

        {confirmation ? (
          <BookingConfirmation
            appointment={confirmation.appointment}
            service={confirmation.service}
            slot={confirmation.slot}
            timezone={confirmation.timezone}
            publicAccessToken={confirmation.publicAccessToken}
            onRestart={handleRestart}
          />
        ) : (
          <>
            <BookingProgressSteps currentStep={step} />

            <h2 ref={headingRef} tabIndex={-1} className="booking-stage-title">
              {STEP_TITLES[step]}
            </h2>

            {step === "service" && (
              <>
                {services.isLoading && (
                  <LoadingState label="A carregar serviços…" />
                )}

                {!services.isLoading && services.errorMessage && (
                  <ErrorState
                    message={services.errorMessage}
                    onRetry={loadServices}
                  />
                )}

                {!services.isLoading &&
                  !services.errorMessage &&
                  services.items.length === 0 && (
                    <EmptyState
                      title="Sem serviços disponíveis"
                      description={BOOKING_NO_SERVICES_MESSAGE}
                      icon="!"
                    />
                  )}

                {!services.isLoading &&
                  !services.errorMessage &&
                  services.items.length > 0 && (
                    <BookingServicePicker
                      services={services.items}
                      selectedServiceId={selectedServiceId}
                      onSelect={(serviceId) => {
                        handleSelectService(serviceId);
                        goToStep("employee");
                      }}
                    />
                  )}

                {selectedServiceId && (
                  <div className="booking-back">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => goToStep("service")}
                    >
                      Voltar
                    </button>
                  </div>
                )}
              </>
            )}

            {step === "employee" && (
              <>
                {employees.isLoading && (
                  <LoadingState label="A carregar profissionais…" />
                )}

                {!employees.isLoading && employees.errorMessage && (
                  <ErrorState
                    message={employees.errorMessage}
                    onRetry={loadEmployees}
                  />
                )}

                {!employees.isLoading &&
                  !employees.errorMessage &&
                  employees.items.length === 0 && (
                    <EmptyState
                      title="Sem profissionais disponíveis"
                      description={BOOKING_NO_EMPLOYEES_MESSAGE}
                      icon="!"
                    />
                  )}

                {!employees.isLoading &&
                  !employees.errorMessage &&
                  employees.items.length > 0 && (
                    <BookingEmployeePicker
                      employees={employees.items}
                      selectedEmployeeId={selectedEmployeeId}
                      onSelect={handleSelectEmployee}
                    />
                  )}

                <div className="booking-back">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => goToStep("service")}
                  >
                    Voltar
                  </button>
                </div>
              </>
            )}

            {step === "schedule" && selectedService && (
              <>
                <BookingDateTimePicker
                  date={date}
                  onDateChange={handleDateChange}
                  minDate={minDate}
                  timezone={timezone}
                  slots={slots}
                  selectedSlot={selectedSlot}
                  isLoading={isLoadingSlots}
                  errorMessage={slotsError}
                  onRetry={() =>
                    setAvailabilityRefresh((value) => value + 1)
                  }
                  onSelectSlot={handleSelectSlot}
                />

                {submitError && (
                  <div className="alert alert-danger" role="alert">
                    {submitError}
                  </div>
                )}

                <div className="d-flex flex-column flex-sm-row gap-2">
                  <button
                    type="button"
                    className="btn btn-primary flex-grow-1"
                    disabled={!canContinueFromSchedule}
                    onClick={() => goToStep("details")}
                  >
                    Continuar
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => goToStep("employee")}
                  >
                    Voltar
                  </button>
                </div>
              </>
            )}

            {step === "details" && (
              <BookingClientDetailsForm
                value={details}
                onChange={setDetails}
                onSubmit={() => goToStep("review")}
                onBack={() => goToStep("schedule")}
              />
            )}

            {step === "review" &&
              selectedService &&
              selectedEmployee &&
              selectedSlot &&
              availability && (
                <BookingReview
                  service={selectedService}
                  employee={selectedEmployee}
                  slot={selectedSlot}
                  timezone={availability.timezone}
                  details={details}
                  isSubmitting={isSubmitting}
                  submitError={submitError}
                  onConfirm={() => void handleConfirm()}
                  onBack={() => goToStep("details")}
                />
              )}
          </>
        )}
      </main>

      <p className="public-footer">
        Página pública de agendamento · SchedulerPro
      </p>
    </div>
  );
}

const STEP_TITLES: Record<BookingStepId, string> = {
  service: "Serviço",
  employee: "Profissional",
  schedule: "Data e hora",
  details: "Os seus dados",
  review: "Revisão",
};