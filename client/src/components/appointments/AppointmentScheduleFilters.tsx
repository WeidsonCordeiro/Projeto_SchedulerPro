import { useId } from "react";
import {
  APPOINTMENT_STATUS_LABELS,
} from "../../config/appointmentStatus";
import { hasActiveFilters } from "../../config/appointmentFilters";
import type { AppointmentFilterCriteria } from "../../config/appointmentFilters";
import type { AppointmentStatus } from "../../types/appointment";
import type { Employee } from "../../types/employee";

const ALL_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

export interface AppointmentScheduleFiltersProps {
  criteria: AppointmentFilterCriteria;
  onCriteriaChange: (criteria: AppointmentFilterCriteria) => void;
  employees: Employee[];
  showEmployeeFilter: boolean;
}

export default function AppointmentScheduleFilters({
  criteria,
  onCriteriaChange,
  employees,
  showEmployeeFilter,
}: AppointmentScheduleFiltersProps) {
  const employeeSelectId = useId();
  const filtersActive = hasActiveFilters(criteria);

  const toggleStatus = (status: AppointmentStatus) => {
    const next = new Set(criteria.statuses);
    if (next.has(status)) {
      next.delete(status);
    } else {
      next.add(status);
    }
    onCriteriaChange({ ...criteria, statuses: next });
  };

  const clearFilters = () => {
    onCriteriaChange({ statuses: new Set(), employeeId: null });
  };

  return (
    <div className="calendar-toolbar-filters">
      <fieldset className="calendar-toolbar-filters-status">
        <legend className="calendar-toolbar-filters-legend">Estado</legend>
        <div
          className="calendar-toolbar-filters-status-group btn-group btn-group-sm flex-wrap"
          role="group"
          aria-label="Filtrar por estado"
        >
          {ALL_STATUSES.map((status) => (
            <button
              key={status}
              type="button"
              className={`btn ${
                criteria.statuses.has(status)
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              aria-pressed={criteria.statuses.has(status)}
              onClick={() => toggleStatus(status)}
            >
              {APPOINTMENT_STATUS_LABELS[status]}
            </button>
          ))}
        </div>
      </fieldset>

      {showEmployeeFilter && (
        <div className="calendar-toolbar-filters-employee">
          <label className="form-label" htmlFor={employeeSelectId}>
            Funcionário
          </label>
          <select
            id={employeeSelectId}
            className="form-select form-select-sm"
            value={criteria.employeeId ?? ""}
            onChange={(event) =>
              onCriteriaChange({
                ...criteria,
                employeeId: event.target.value || null,
              })
            }
          >
            <option value="">Todos os funcionários</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {filtersActive && (
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary calendar-toolbar-filters-clear"
          onClick={clearFilters}
        >
          Limpar filtros
        </button>
      )}
    </div>
  );
}
