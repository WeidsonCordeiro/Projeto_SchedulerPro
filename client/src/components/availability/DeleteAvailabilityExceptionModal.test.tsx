import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteAvailabilityExceptionModal from "./DeleteAvailabilityExceptionModal";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { httpError } from "../../test/http";
import type { AvailabilityException } from "../../types/availabilityException";

vi.mock("../../api/endpoints/availabilityExceptions.api", () => ({
  default: {
    deleteAvailabilityException: vi.fn(),
  },
}));

function makeException(): AvailabilityException {
  return {
    id: "ex1",
    companyId: "c1",
    employeeId: "e1",
    date: "2026-10-15",
    allDay: true,
    startTime: null,
    endTime: null,
    type: "VACATION",
    reason: "Férias",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderModal(
  overrides: Partial<Parameters<typeof DeleteAvailabilityExceptionModal>[0]> = {},
) {
  const props: Parameters<typeof DeleteAvailabilityExceptionModal>[0] = {
    isOpen: true,
    exception: makeException(),
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(<DeleteAvailabilityExceptionModal {...props} />);
  return props;
}

describe("DeleteAvailabilityExceptionModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while closed or without an exception", () => {
    const { container } = render(
      <DeleteAvailabilityExceptionModal
        isOpen={false}
        exception={makeException()}
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the confirmation text and formatted exception summary", () => {
    renderModal();

    expect(
      screen.getByText("Tem certeza que deseja excluir esta exceção?"),
    ).toBeInTheDocument();
    expect(screen.getByText(/15\/10\/2026/)).toBeInTheDocument();
  });

  it("deletes the exception after confirmation", async () => {
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    vi.mocked(availabilityExceptionApi.deleteAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: null,
    });

    renderModal({ onDeleted, onClose });

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Excluir",
      }),
    );

    expect(availabilityExceptionApi.deleteAvailabilityException).toHaveBeenCalledWith(
      "ex1",
    );
    await vi.waitFor(() => expect(onDeleted).toHaveBeenCalled());
    expect(onClose).toHaveBeenCalled();
  });

  it("does not delete when cancelled", () => {
    const onClose = vi.fn();

    renderModal({ onClose });

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: /cancelar/i,
      }),
    );

    expect(
      availabilityExceptionApi.deleteAvailabilityException,
    ).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows friendly errors inside the dialog", async () => {
    vi.mocked(availabilityExceptionApi.deleteAvailabilityException).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderModal();

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", {
        name: "Excluir",
      }),
    );

    expect(
      await within(screen.getByRole("dialog")).findByRole("alert"),
    ).toHaveTextContent("Erro interno do servidor.");
  });
});
