import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvailabilityExceptionFormModal from "./AvailabilityExceptionFormModal";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { AvailabilityException } from "../../types/availabilityException";

vi.mock("../../api/endpoints/availabilityExceptions.api", () => ({
  default: {
    createAvailabilityException: vi.fn(),
    updateAvailabilityException: vi.fn(),
  },
}));

function makeException(overrides: Partial<AvailabilityException> = {}): AvailabilityException {
  return {
    id: "exc1",
    companyId: user.companyId,
    employeeId: "employee1",
    date: "2026-09-15",
    allDay: false,
    startTime: "10:00",
    endTime: "11:00",
    type: "BLOCK",
    reason: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function renderModal(
  overrides: Partial<Parameters<typeof AvailabilityExceptionFormModal>[0]> = {},
) {
  const props: Parameters<typeof AvailabilityExceptionFormModal>[0] = {
    isOpen: true,
    employeeId: "employee1",
    exception: null,
    onClose: vi.fn(),
    onSaved: vi.fn(),
    ...overrides,
  };
  render(<AvailabilityExceptionFormModal {...props} />);
  return props;
}

function getDialog() {
  return screen.getByRole("dialog");
}

describe("AvailabilityExceptionFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while closed", () => {
    const { container } = render(
      <AvailabilityExceptionFormModal
        isOpen={false}
        employeeId="employee1"
        exception={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("cria uma exceção parcial válida", async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();
    vi.mocked(availabilityExceptionApi.createAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: makeException(),
    });

    renderModal({ onSaved, onClose });

    fireEvent.change(within(getDialog()).getByLabelText("Data"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Início"), {
      target: { value: "14:00" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Fim"), {
      target: { value: "15:00" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Motivo (opcional)"), {
      target: { value: "Reunião" },
    });

    fireEvent.click(
      within(getDialog()).getByRole("button", { name: "Criar exceção" }),
    );

    expect(
      availabilityExceptionApi.createAvailabilityException,
    ).toHaveBeenCalledWith({
      employeeId: "employee1",
      date: "2026-09-20",
      allDay: false,
      startTime: "14:00",
      endTime: "15:00",
      type: "BLOCK",
      reason: "Reunião",
    });
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("cria exceção de dia inteiro sem enviar horários", async () => {
    vi.mocked(availabilityExceptionApi.createAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: makeException(),
    });

    renderModal();

    fireEvent.change(within(getDialog()).getByLabelText("Data"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.click(within(getDialog()).getByLabelText("Dia inteiro"));

    expect(
      within(getDialog()).queryByLabelText("Início"),
    ).not.toBeInTheDocument();

    fireEvent.click(
      within(getDialog()).getByRole("button", { name: "Criar exceção" }),
    );

    expect(
      availabilityExceptionApi.createAvailabilityException,
    ).toHaveBeenCalledWith(
      expect.objectContaining({ allDay: true, startTime: null, endTime: null }),
    );
  });

  it("rejeita período sem horários no cliente", async () => {
    renderModal();

    fireEvent.change(within(getDialog()).getByLabelText("Data"), {
      target: { value: "2026-09-20" },
    });

    fireEvent.click(
      within(getDialog()).getByRole("button", { name: "Criar exceção" }),
    );

    expect(
      screen.getByText("Informe o horário inicial e final do bloqueio."),
    ).toBeInTheDocument();
    expect(
      availabilityExceptionApi.createAvailabilityException,
    ).not.toHaveBeenCalled();
  });

  it("rejeita início depois do fim", async () => {
    renderModal();

    fireEvent.change(within(getDialog()).getByLabelText("Data"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Início"), {
      target: { value: "16:00" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Fim"), {
      target: { value: "15:00" },
    });

    fireEvent.click(
      within(getDialog()).getByRole("button", { name: "Criar exceção" }),
    );

    expect(
      screen.getByText("O horário inicial deve ser anterior ao horário final."),
    ).toBeInTheDocument();
  });

  it("edita uma exceção existente preservando horários", async () => {
    const exception = makeException({ reason: "Férias" });
    const onSaved = vi.fn();
    vi.mocked(availabilityExceptionApi.updateAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: exception,
    });

    renderModal({ exception, onSaved });

    fireEvent.change(within(getDialog()).getByLabelText("Motivo (opcional)"), {
      target: { value: "Férias agendadas" },
    });

    fireEvent.click(within(getDialog()).getByRole("button", { name: "Salvar" }));

    expect(
      availabilityExceptionApi.updateAvailabilityException,
    ).toHaveBeenCalledWith(
      "exc1",
      expect.objectContaining({
        date: "2026-09-15",
        startTime: "10:00",
        endTime: "11:00",
        reason: "Férias agendadas",
      }),
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalled());
  });

  it("mostra erro amigável do backend", async () => {
    vi.mocked(availabilityExceptionApi.createAvailabilityException).mockRejectedValue(
      httpError(409, { message: "Conflito" }),
    );

    renderModal();

    fireEvent.change(within(getDialog()).getByLabelText("Data"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Início"), {
      target: { value: "10:00" },
    });
    fireEvent.change(within(getDialog()).getByLabelText("Fim"), {
      target: { value: "11:00" },
    });

    fireEvent.click(
      within(getDialog()).getByRole("button", { name: "Criar exceção" }),
    );

    expect(await within(getDialog()).findByRole("alert")).toHaveTextContent(
      "Conflito",
    );
  });
});