import { useCallback, useEffect, useMemo, useState } from "react";
import availabilityApi from "../../api/endpoints/availability.api";
import employeesApi from "../../api/endpoints/employees.api";
import { getApiError, getFriendlyErrorMessage } from "../../api/errors";
import AvailabilityDayEditor from "../../components/availability/AvailabilityDayEditor";
import DeleteAvailabilityDayModal from "../../components/availability/DeleteAvailabilityDayModal";
import AvailabilityExceptionsSection from "../../components/availability/AvailabilityExceptionsSection";
import { getAvailabilityAbilities } from "../../config/availabilityPermissions";
import {
  EMPTY_DAY_DRAFT,
  toPeriodPayload,
  validateDayDraft,
} from "../../config/availabilityRules";
import { DAY_LABELS, DAY_ORDER } from "../../config/dayOfWeek";
import { useAppSelector } from "../../store";
import type {
  Availability,
  DayOfWeek,
} from "../../types/availability";
import type { DayDraft } from "../../config/availabilityRules";
import type { Employee, EmployeeRole } from "../../types/employee";

const CAN_LIST_USERS_ROLES: EmployeeRole[] = ["OWNER", "ADMIN"];

function createEmptyDrafts(): Record<DayOfWeek, DayDraft> {
  return DAY_ORDER.reduce<Record<DayOfWeek, DayDraft>>(
    (acc, day) => {
      acc[day] = { ...EMPTY_DAY_DRAFT };
      return acc;
    },
    {} as Record<DayOfWeek, DayDraft>,
  );
}

function createEmptyAvailabilityMap(): Record<
  DayOfWeek,
  Availability | undefined
> {
  const map = {} as Record<DayOfWeek, Availability | undefined>;
  DAY_ORDER.forEach((day) => {
    map[day] = undefined;
  });
  return map;
}

function createEmptyDayErrors(): Record<DayOfWeek, string | null> {
  const map = {} as Record<DayOfWeek, string | null>;
  DAY_ORDER.forEach((day) => {
    map[day] = null;
  });
  return map;
}

function docToDraft(availability: Availability): DayDraft {
  return {
    morningStart: availability.morningStart ?? "",
    morningEnd: availability.morningEnd ?? "",
    afternoonStart: availability.afternoonStart ?? "",
    afternoonEnd: availability.afternoonEnd ?? "",
  };
}

export default function AvailabilityPage() {
  const currentUser = useAppSelector((state) => state.auth.user);
  const actorRole = currentUser?.role ?? null;
  const { canList, canCreate, canUpdate, canDelete } =
    getAvailabilityAbilities(actorRole);
  const canListUsers =
    currentUser?.role != null && CAN_LIST_USERS_ROLES.includes(currentUser.role);

  const [availabilityByDay, setAvailabilityByDay] = useState<
    Record<DayOfWeek, Availability | undefined>
  >(createEmptyAvailabilityMap);
  const [drafts, setDrafts] = useState<Record<DayOfWeek, DayDraft>>(
    createEmptyDrafts,
  );
  const [dayErrors, setDayErrors] = useState<Record<DayOfWeek, string | null>>(
    createEmptyDayErrors,
  );

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    currentUser?.id ?? "",
  );
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [employeesLoadError, setEmployeesLoadError] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [savingDay, setSavingDay] = useState<DayOfWeek | null>(null);
  const [removingDay, setRemovingDay] = useState<DayOfWeek | null>(null);

  const loadEmployees = useCallback(async () => {
    if (!canListUsers) {
      setEmployees([]);
      return;
    }

    setIsLoadingEmployees(true);
    setEmployeesLoadError(null);
    try {
      const response = await employeesApi.getEmployees();
      const list = (response.data ?? []).filter(
        (employee) => employee.role !== "CLIENT",
      );
      setEmployees(list);
    } catch (error) {
      const failure = getApiError(error);
      setEmployeesLoadError(getFriendlyErrorMessage(failure));
      setEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [canListUsers]);

  const loadAvailability = useCallback(async (employeeId: string) => {
    if (!employeeId) {
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const response = await availabilityApi.getEmployeeAvailabilities(
        employeeId,
      );
      const list = response.data ?? [];
      const byDay = createEmptyAvailabilityMap();
      list.forEach((availability) => {
        byDay[availability.dayOfWeek] = availability;
      });
      setAvailabilityByDay(byDay);

      const nextDrafts = createEmptyDrafts();
      list.forEach((availability) => {
        nextDrafts[availability.dayOfWeek] = docToDraft(availability);
      });
      setDrafts(nextDrafts);
      setDayErrors(createEmptyDayErrors);
    } catch (error) {
      const failure = getApiError(error);
      setLoadError(getFriendlyErrorMessage(failure));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!canList) {
      return;
    }
    void loadEmployees();
  }, [canList, loadEmployees]);

  useEffect(() => {
    if (!canList) {
      return;
    }
    void loadAvailability(selectedEmployeeId);
  }, [canList, selectedEmployeeId, loadAvailability]);

  const employeeOptions = useMemo(() => {
    if (canListUsers) {
      if (employees.length > 0) {
        return employees;
      }
      if (currentUser) {
        return [
          {
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: currentUser.role,
            companyId: currentUser.companyId,
            createdAt: "",
            updatedAt: "",
          },
        ];
      }
      return [];
    }

    if (currentUser) {
      return [
        {
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          role: currentUser.role,
          companyId: currentUser.companyId,
          createdAt: "",
          updatedAt: "",
        },
      ];
    }
    return [];
  }, [canListUsers, employees, currentUser]);

  function handleEmployeeChange(employeeId: string) {
    setSelectedEmployeeId(employeeId);
    setSuccessMessage(null);
    setDayErrors(createEmptyDayErrors);
  }

  function handleDraftChange(day: DayOfWeek, patch: Partial<DayDraft>) {
    setDrafts((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
    setDayErrors((prev) => ({ ...prev, [day]: null }));
  }

  async function handleSave(day: DayOfWeek) {
    const draft = drafts[day];
    const clientError = validateDayDraft(draft);
    if (clientError) {
      setDayErrors((prev) => ({ ...prev, [day]: clientError }));
      return;
    }

    setSavingDay(day);
    try {
      const existing = availabilityByDay[day];
      const periods = toPeriodPayload(draft);
      const response = existing
        ? await availabilityApi.updateAvailability(existing.id, periods)
        : await availabilityApi.createAvailability({
            employeeId: selectedEmployeeId,
            dayOfWeek: day,
            ...periods,
          });

      const saved = response.data;
      if (saved) {
        setAvailabilityByDay((prev) => ({ ...prev, [day]: saved }));
        setDrafts((prev) => ({ ...prev, [day]: docToDraft(saved) }));
        setSuccessMessage(
          existing
            ? "Disponibilidade do funcionário atualizada com sucesso."
            : "Disponibilidade do funcionário criada com sucesso.",
        );
      }
    } catch (error) {
      const failure = getApiError(error);
      const message = getFriendlyErrorMessage(failure);
      setDayErrors((prev) => ({ ...prev, [day]: message }));
      setSuccessMessage(null);
    } finally {
      setSavingDay(null);
    }
  }

  function handleRemoved() {
    if (removingDay == null) {
      return;
    }
    setAvailabilityByDay((prev) => {
      const next = { ...prev };
      delete next[removingDay!];
      return next;
    });
    setDrafts((prev) => ({
      ...prev,
      [removingDay!]: { ...EMPTY_DAY_DRAFT },
    }));
    setSuccessMessage("Disponibilidade do funcionário removida com sucesso.");
    setRemovingDay(null);
  }

  if (!canList) {
    return (
      <section>
        <div className="mb-3">
          <h1 className="h3 mb-0">Disponibilidade</h1>
        </div>
        <div className="alert alert-warning" role="alert">
          Você não tem permissão para acessar esta página.
        </div>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-3">
        <h1 className="h3 mb-0">Disponibilidade</h1>
      </div>

      {successMessage && (
        <div className="alert alert-success" role="alert">
          {successMessage}
        </div>
      )}

      {!canListUsers && (
        <div className="alert alert-info" role="alert">
          Você está visualizando sua própria disponibilidade.
        </div>
      )}

      {canListUsers && employeeOptions.length > 0 && (
        <div className="mb-3 col-md-6 col-lg-4">
          <label htmlFor="availability-employee" className="form-label">
            Funcionário
          </label>
          <select
            id="availability-employee"
            className="form-select"
            value={selectedEmployeeId}
            disabled={isLoadingEmployees}
            onChange={(event) => handleEmployeeChange(event.target.value)}
          >
            {employeeOptions.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {canListUsers && employeesLoadError && (
        <div className="alert alert-warning" role="alert">
          {employeesLoadError} Lista de funcionários indisponível; será exibida
          a sua própria disponibilidade.
        </div>
      )}

      {isLoading && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Carregando...</span>
          </div>
        </div>
      )}

      {!isLoading && loadError && (
        <div className="alert alert-danger" role="alert">
          {loadError}
          <div className="mt-2">
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={() => void loadAvailability(selectedEmployeeId)}
            >
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="row g-3">
          {DAY_ORDER.map((day) => {
            const existing = availabilityByDay[day];
            const existingDay = Boolean(existing);
            const editable = existingDay ? canUpdate : canCreate;
            const removeEnabled = existingDay && canDelete;

            return (
              <div key={day} className="col-md-6 col-xxl-4">
                <AvailabilityDayEditor
                  day={day}
                  label={DAY_LABELS[day]}
                  existing={existing ?? null}
                  draft={drafts[day]}
                  editable={editable}
                  canRemove={removeEnabled}
                  isSaving={savingDay === day}
                  error={dayErrors[day] ?? null}
                  onChange={(patch) => handleDraftChange(day, patch)}
                  onSave={() => void handleSave(day)}
                  onRemove={() => setRemovingDay(day)}
                />
              </div>
            );
          })}
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="mt-4">
          <AvailabilityExceptionsSection
            employeeId={selectedEmployeeId}
            canCreate={canCreate}
            canUpdate={canUpdate}
            canDelete={canDelete}
            onSuccess={setSuccessMessage}
          />
        </div>
      )}

      <DeleteAvailabilityDayModal
        isOpen={removingDay != null}
        availability={availabilityByDay[removingDay ?? 0] ?? null}
        dayLabel={
          removingDay != null ? DAY_LABELS[removingDay] : ""
        }
        onClose={() => setRemovingDay(null)}
        onDeleted={handleRemoved}
      />
    </section>
  );
}