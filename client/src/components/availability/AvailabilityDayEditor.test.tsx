import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AvailabilityDayEditor from "./AvailabilityDayEditor";
import type { Availability, DayOfWeek } from "../../types/availability";
import type { DayDraft } from "../../config/availabilityRules";

const draft: DayDraft = {
  morningStart: "09:00",
  morningEnd: "12:00",
  afternoonStart: "",
  afternoonEnd: "",
};

function makeAvailability(): Availability {
  return {
    id: "abc123",
    companyId: "c1",
    employeeId: "e1",
    dayOfWeek: 1,
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: null,
    afternoonEnd: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderEditor(
  overrides: Partial<Parameters<typeof AvailabilityDayEditor>[0]> = {},
) {
  const props: Parameters<typeof AvailabilityDayEditor>[0] = {
    day: 1 as DayOfWeek,
    label: "Segunda-feira",
    existing: null,
    draft,
    editable: false,
    canRemove: false,
    isSaving: false,
    error: null,
    onChange: vi.fn(),
    onSave: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<AvailabilityDayEditor {...props} />);
  return props;
}

describe("AvailabilityDayEditor", () => {
  it("shows the day label and the closed badge for an empty day", () => {
    renderEditor();

    expect(
      screen.getByRole("heading", { name: "Segunda-feira" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Sem disponibilidade")).toBeInTheDocument();
    expect(screen.getAllByRole("switch")[0]).not.toBeChecked();
  });

it("shows the available badge with a checked switch for an existing day", () => {
    renderEditor({ existing: makeAvailability() });

    expect(screen.getAllByText("Disponível")).toHaveLength(2);
    expect(screen.getAllByRole("switch")[0]).toBeChecked();
  });

  it("disables the inputs when not editable", () => {
    renderEditor();

    expect(
      document.getElementById("availability-morning-start-1"),
    ).toBeDisabled();
    expect(
      document.getElementById("availability-afternoon-end-1"),
    ).toBeDisabled();
  });

  it("enables inputs and renders the save button when editable", () => {
    renderEditor({ editable: true, existing: makeAvailability() });

    expect(
      document.getElementById("availability-morning-start-1"),
    ).toBeEnabled();
    expect(
      screen.getByRole("button", { name: "Salvar Segunda-feira" }),
    ).toBeInTheDocument();
  });

  it("hides the save button when not editable", () => {
    renderEditor();

    expect(
      screen.queryByRole("button", { name: "Salvar Segunda-feira" }),
    ).not.toBeInTheDocument();
  });

  it("forwards draft changes for both periods without converting times", () => {
    const props = renderEditor({ editable: true });

    fireEvent.change(
      document.getElementById("availability-morning-start-1")!,
      { target: { value: "08:30" } },
    );
    fireEvent.change(
      document.getElementById("availability-afternoon-start-1")!,
      { target: { value: "13:00" } },
    );

    expect(props.onChange).toHaveBeenCalledWith({ morningStart: "08:30" });
    expect(props.onChange).toHaveBeenCalledWith({ afternoonStart: "13:00" });
  });

  it("calls onSave when clicking the save button", () => {
    const props = renderEditor({ editable: true });
    fireEvent.click(
      screen.getByRole("button", { name: "Salvar Segunda-feira" }),
    );
    expect(props.onSave).toHaveBeenCalled();
  });

  it("triggers onRemove when unchecking the switch of an existing day", () => {
    const props = renderEditor({
      existing: makeAvailability(),
      editable: true,
      canRemove: true,
    });

    fireEvent.click(screen.getAllByRole("switch")[0]);

    expect(props.onRemove).toHaveBeenCalled();
  });

  it("keeps the switch locked when the day cannot be removed", () => {
    renderEditor({ existing: makeAvailability(), editable: true });

    expect(screen.getAllByRole("switch")[0]).toBeDisabled();
  });

  it("shows the creation hint for empty days that cannot be created", () => {
    renderEditor();

    expect(
      screen.getByText(
        "Apenas perfis com permissão de criação podem adicionar dias.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the error message when provided", () => {
    renderEditor({ error: "Dados inválidos." });

    expect(screen.getByRole("alert")).toHaveTextContent("Dados inválidos.");
  });

  it("shows a saving state while saving", () => {
    renderEditor({ editable: true, isSaving: true });

    expect(
      screen.getByRole("button", { name: "Salvando..." }),
    ).toBeDisabled();
  });
});