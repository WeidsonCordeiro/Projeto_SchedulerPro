import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeleteAvailabilityDayModal from "./DeleteAvailabilityDayModal";
import availabilityApi from "../../api/endpoints/availability.api";
import { httpError } from "../../test/http";
import type { Availability } from "../../types/availability";

vi.mock("../../api/endpoints/availability.api", () => ({
  default: {
    deleteAvailability: vi.fn(),
  },
}));

function makeAvailability(): Availability {
  return {
    id: "abc123",
    companyId: "c1",
    employeeId: "e1",
    dayOfWeek: 3,
    morningStart: "09:00",
    morningEnd: "12:00",
    afternoonStart: "13:00",
    afternoonEnd: "18:00",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function renderModal(
  overrides: Partial<Parameters<typeof DeleteAvailabilityDayModal>[0]> = {},
) {
  const props: Parameters<typeof DeleteAvailabilityDayModal>[0] = {
    isOpen: true,
    availability: makeAvailability(),
    dayLabel: "Quarta-feira",
    onClose: vi.fn(),
    onDeleted: vi.fn(),
    ...overrides,
  };
  render(<DeleteAvailabilityDayModal {...props} />);
  return props;
}

describe("DeleteAvailabilityDayModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing while closed or without an availability", () => {
    const { container } = render(
      <DeleteAvailabilityDayModal
        isOpen={false}
        availability={makeAvailability()}
        dayLabel="Quarta-feira"
        onClose={vi.fn()}
        onDeleted={vi.fn()}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the confirmation text and the day label", () => {
    renderModal();

    expect(
      screen.getByText("Tem certeza que deseja excluir esta disponibilidade?"),
    ).toBeInTheDocument();
    expect(screen.getByText("Quarta-feira")).toBeInTheDocument();
  });

  it("deletes the availability after confirmation", async () => {
    const onDeleted = vi.fn();
    const onClose = vi.fn();
    vi.mocked(availabilityApi.deleteAvailability).mockResolvedValue({
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

    expect(availabilityApi.deleteAvailability).toHaveBeenCalledWith("abc123");
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

    expect(availabilityApi.deleteAvailability).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows friendly errors inside the dialog", async () => {
    vi.mocked(availabilityApi.deleteAvailability).mockRejectedValue(
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