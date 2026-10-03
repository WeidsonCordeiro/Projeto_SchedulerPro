export type BookingStepId =
  | "service"
  | "employee"
  | "schedule"
  | "details"
  | "review";

interface BookingProgressStepsProps {
  /** Etapa visível no ecrã, identificada pela sua chave. */
  currentStep: BookingStepId;
}

/**
 * As cinco etapas da marcação, por ordem.
 *
 * `id` duplo de propósito: um é a chave interna do estado, o outro é o texto
 * que o utilizador lê. Misturar os dois obrigaria a mostrar "employee" como
 * título de uma etapa.
 */
const STEPS: { id: BookingStepId; label: string }[] = [
  { id: "service", label: "Serviço" },
  { id: "employee", label: "Profissional" },
  { id: "schedule", label: "Data e hora" },
  { id: "details", label: "Os seus dados" },
  { id: "review", label: "Revisão" },
];

/**
 * Indicador de progresso da marcação.
 *
 * A lista é uma `<ol>` e não uma barra decorativa: quem navega por teclado ou
 * leitor de ecrã precisa de saber em que etapa está e quantas faltam — e essa
 * informação não existe em `aria-valuenow` de um elemento vazio.
 *
 * Só a etapa atual recebe `aria-current="step"`. As concluídas ficam marcadas
 * por estilo, sem `aria-current`, para não haver dois "estou aqui" no ecrã.
 */
export default function BookingProgressSteps({
  currentStep,
}: BookingProgressStepsProps) {
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);

  return (
    <nav aria-label="Etapas do agendamento">
      <ol className="booking-steps">
        {STEPS.map((step, index) => {
          const isCurrent = index === currentIndex;
          const isDone = index < currentIndex;
          return (
            <li
              key={step.id}
              className={`booking-step${isCurrent ? " is-current" : ""}${
                isDone ? " is-done" : ""
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span className="booking-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <span className="booking-step-label">{step.label}</span>
            </li>
          );
        })}
      </ol>
      <p className="visually-hidden" aria-live="polite">
        {`Etapa ${currentIndex + 1} de ${STEPS.length}: ${
          STEPS[currentIndex].label
        }`}
      </p>
    </nav>
  );
}