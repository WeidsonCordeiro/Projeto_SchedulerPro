import type { Availability, DayOfWeek } from "../../types/availability";
import type { DayDraft } from "../../config/availabilityRules";

interface AvailabilityDayEditorProps {
  day: DayOfWeek;
  label: string;
  existing: Availability | null;
  draft: DayDraft;
  editable: boolean;
  canRemove: boolean;
  isSaving: boolean;
  error: string | null;
  onChange: (patch: Partial<DayDraft>) => void;
  onSave: () => void;
  onRemove: () => void;
}

export default function AvailabilityDayEditor({
  day,
  label,
  existing,
  draft,
  editable,
  canRemove,
  isSaving,
  error,
  onChange,
  onSave,
  onRemove,
}: AvailabilityDayEditorProps) {
  const available = Boolean(existing);

  return (
    <div className="card h-100">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div>
            <h2 className="h6 mb-1">{label}</h2>
            <span
              className={`badge ${available ? "text-bg-success" : "text-bg-secondary"}`}
            >
              {available ? "Disponível" : "Sem disponibilidade"}
            </span>
          </div>

          <div className="form-check form-switch">
            <input
              id={`availability-switch-${day}`}
              className="form-check-input"
              type="checkbox"
              role="switch"
              checked={available}
              disabled={!existing || !canRemove}
              onChange={onRemove}
            />
            <label
              className="form-check-label"
              htmlFor={`availability-switch-${day}`}
            >
              Disponível
            </label>
          </div>
        </div>

        <div className="row g-3">
          <div className="col-md-6">
            <p className="small text-muted mb-2">Manhã</p>
            <div className="d-flex gap-2">
              <div className="flex-fill">
                <label
                  htmlFor={`availability-morning-start-${day}`}
                  className="form-label small mb-1"
                >
                  Inicial
                </label>
                <input
                  id={`availability-morning-start-${day}`}
                  type="time"
                  className="form-control form-control-sm"
                  value={draft.morningStart}
                  disabled={!editable || isSaving}
                  onChange={(event) =>
                    onChange({ morningStart: event.target.value })
                  }
                />
              </div>
              <div className="flex-fill">
                <label
                  htmlFor={`availability-morning-end-${day}`}
                  className="form-label small mb-1"
                >
                  Final
                </label>
                <input
                  id={`availability-morning-end-${day}`}
                  type="time"
                  className="form-control form-control-sm"
                  value={draft.morningEnd}
                  disabled={!editable || isSaving}
                  onChange={(event) =>
                    onChange({ morningEnd: event.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <p className="small text-muted mb-2">Tarde</p>
            <div className="d-flex gap-2">
              <div className="flex-fill">
                <label
                  htmlFor={`availability-afternoon-start-${day}`}
                  className="form-label small mb-1"
                >
                  Inicial
                </label>
                <input
                  id={`availability-afternoon-start-${day}`}
                  type="time"
                  className="form-control form-control-sm"
                  value={draft.afternoonStart}
                  disabled={!editable || isSaving}
                  onChange={(event) =>
                    onChange({ afternoonStart: event.target.value })
                  }
                />
              </div>
              <div className="flex-fill">
                <label
                  htmlFor={`availability-afternoon-end-${day}`}
                  className="form-label small mb-1"
                >
                  Final
                </label>
                <input
                  id={`availability-afternoon-end-${day}`}
                  type="time"
                  className="form-control form-control-sm"
                  value={draft.afternoonEnd}
                  disabled={!editable || isSaving}
                  onChange={(event) =>
                    onChange({ afternoonEnd: event.target.value })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        {!existing && !editable && (
          <div className="form-text mt-2">
            Apenas perfis com permissão de criação podem adicionar dias.
          </div>
        )}

        {error && (
          <div className="alert alert-danger mt-3 py-2 small" role="alert">
            {error}
          </div>
        )}

        {editable && (
          <div className="mt-3 d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving && (
                <span
                  className="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                />
              )}
              {isSaving ? "Salvando..." : `Salvar ${label}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}