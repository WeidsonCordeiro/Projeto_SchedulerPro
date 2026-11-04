import { useRef } from "react";
import type { KeyboardEvent } from "react";
import ImageAvatar from "../common/ImageAvatar";
import type { Employee } from "../../types/employee";

interface EmployeeAvatarPickerProps {
  /** Lista já filtrada pelo consumidor. Nenhuma regra é aplicada aqui. */
  employees: Employee[];
  /** Id do funcionário selecionado ("" quando nada foi escolhido). */
  value: string;
  onChange: (employeeId: string) => void;
  disabled?: boolean;
  /** Marca o grupo como inválido para espelhar a mensagem de erro do formulário. */
  invalid?: boolean;
  /** Rótulo do grupo, anunciado por leitores de ecrã. */
  label: string;
  /** Id do elemento que contém o rótulo visível. Tem prioridade sobre `label`. */
  labelId?: string;
  /** Id do elemento com a mensagem de erro, para leitores de ecrã. */
  describedById?: string;
}

/**
 * Rótulo textual de uma opção. Fica também no `aria-label` do cartão para que o
 * nome acessível não mude quando o selo de "selecionado" entra no DOM.
 */
function optionLabel(employee: Employee): string {
  return employee.role === "CLIENT"
    ? `${employee.name} (sem perfil de funcionário)`
    : employee.name;
}

/**
 * Seleção de funcionário por cartões, com foto do profissional (ou iniciais
 * quando não existe imagem) e estado selecionado visível.
 *
 * Substitui o `<select>` nativo, que não permite mostrar imagens. É apenas
 * apresentação: não conhece a API nem altera regras de negócio, e delega a
 * lista já filtrada a quem o usa. A seleção continua a ser um único valor
 * controlado por `value`/`onChange`.
 *
 * Acessibilidade: padrão ARIA de radiogroup com tabindex rotativo — só o
 * cartão selecionado (ou o primeiro, quando nada está selecionado) entra no
 * ciclo de tabulação, e as setas movem o foco selecionando o cartão vizinho.
 */
export default function EmployeeAvatarPicker({
  employees,
  value,
  onChange,
  disabled = false,
  invalid = false,
  label,
  labelId,
  describedById,
}: EmployeeAvatarPickerProps) {
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (disabled) {
      return;
    }

    const lastIndex = employees.length - 1;
    let nextIndex: number;

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = index === lastIndex ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = index === 0 ? lastIndex : index - 1;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = lastIndex;
        break;
      default:
        return;
    }

    event.preventDefault();
    onChange(employees[nextIndex].id);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div
      className={`employee-picker${invalid ? " is-invalid" : ""}`}
      role="radiogroup"
      aria-label={labelId ? undefined : label}
      aria-labelledby={labelId}
      aria-describedby={describedById}
      aria-invalid={invalid || undefined}
    >
      {employees.length === 0 ? (
        <p className="text-muted small mb-0">Nenhum funcionário disponível.</p>
      ) : (
        employees.map((employee, index) => {
          const isSelected = employee.id === value;
          // Tabindex rotativo: o selecionado é o alvo do Tab; sem seleção,
          // o primeiro cartão assume o papel para não haver um beco sem saída.
          const isTabbable = isSelected || (value === "" && index === 0);

          return (
            <button
              key={employee.id}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={optionLabel(employee)}
              tabIndex={isTabbable ? 0 : -1}
              disabled={disabled}
              data-employee-id={employee.id}
              className={`employee-option${isSelected ? " is-selected" : ""}`}
              onClick={() => onChange(employee.id)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <ImageAvatar
                image={employee.avatar}
                name={employee.name}
                // Decorativa: o nome é apresentado em texto ao lado da imagem.
                alt=""
                size="md"
                shape="circle"
              />
              <span className="employee-option-text">
                <span className="employee-option-name">{employee.name}</span>
                {employee.role === "CLIENT" && (
                  <span className="employee-option-hint">(sem perfil de funcionário)</span>
                )}
              </span>
              {isSelected && (
                <span className="employee-option-check" aria-hidden="true">
                  ✓
                </span>
              )}
            </button>
          );
        })
      )}
    </div>
  );
}
