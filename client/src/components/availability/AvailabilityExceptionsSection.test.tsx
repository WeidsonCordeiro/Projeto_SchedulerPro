import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvailabilityExceptionsSection from "./AvailabilityExceptionsSection";
import availabilityExceptionApi from "../../api/endpoints/availabilityExceptions.api";
import { httpError } from "../../test/http";
import { user } from "../../test/fixtures";
import type { AvailabilityException } from "../../types/availabilityException";

vi.mock("../../api/endpoints/availabilityExceptions.api", () => ({
  default: {
    getAvailabilityExceptions: vi.fn(),
    createAvailabilityException: vi.fn(),
    updateAvailabilityException: vi.fn(),
    deleteAvailabilityException: vi.fn(),
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

function renderSection(
  overrides: Partial<Parameters<typeof AvailabilityExceptionsSection>[0]> = {},
) {
  const props: Parameters<typeof AvailabilityExceptionsSection>[0] = {
    employeeId: "employee1",
    canCreate: true,
    canUpdate: true,
    canDelete: true,
    onSuccess: vi.fn(),
    ...overrides,
  };
  render(<AvailabilityExceptionsSection {...props} />);
  return props;
}

describe("AvailabilityExceptionsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista as exceções carregadas da API", async () => {
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        makeException({ type: "VACATION", reason: "Férias" }),
        makeException({
          id: "exc2",
          allDay: true,
          type: "HOLIDAY",
          reason: null,
        }),
      ],
    });

    renderSection();

    expect((await screen.findAllByText("15/09/2026")).length).toBe(2);
    expect(screen.getByText("Férias", { selector: ".badge" })).toBeInTheDocument();
    expect(screen.getByText("Feriado", { selector: ".badge" })).toBeInTheDocument();
    expect(screen.getByText(/— Férias/)).toBeInTheDocument();
    expect(screen.getAllByText("Dia inteiro").length).toBeGreaterThan(0);
    expect(
      availabilityExceptionApi.getAvailabilityExceptions,
    ).toHaveBeenCalledWith("employee1");
  });

  it("mostra estado vazio quando não há exceções", async () => {
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderSection();

    expect(
      await screen.findByText("Nenhuma exceção cadastrada para este funcionário."),
    ).toBeInTheDocument();
  });

  it("não pesquisa sem funcionário selecionado", async () => {
    renderSection({ employeeId: "" });

    await waitFor(() => {
      expect(
        availabilityExceptionApi.getAvailabilityExceptions,
      ).not.toHaveBeenCalled();
    });
  });

  it("mostra erro de carregamento com tentativa novamente", async () => {
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions)
      .mockRejectedValueOnce(httpError(500, { message: "Erro interno do servidor." }))
      .mockResolvedValueOnce({ success: true, message: "ok", data: [] });

    renderSection();

    expect(
      await screen.findByText("Erro interno do servidor."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));

    expect(
      await screen.findByText("Nenhuma exceção cadastrada para este funcionário."),
    ).toBeInTheDocument();
    expect(
      availabilityExceptionApi.getAvailabilityExceptions,
    ).toHaveBeenCalledTimes(2);
  });

  it("esconde o botão de nova exceção sem permissão de criação", async () => {
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderSection({ canCreate: false });

    await screen.findByText("Nenhuma exceção cadastrada para este funcionário.");
    expect(
      screen.queryByRole("button", { name: "Nova exceção" }),
    ).not.toBeInTheDocument();
  });

  it("abre o modal de nova exceção ao clicar em Nova exceção", async () => {
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });

    renderSection();

    fireEvent.click(
      await screen.findByRole("button", { name: "Nova exceção" }),
    );

    expect(
      screen.getByRole("heading", { name: "Nova exceção de disponibilidade" }),
    ).toBeInTheDocument();
  });

  it("cria uma exceção e recoloca a lista após salvar", async () => {
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    vi.mocked(availabilityExceptionApi.createAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: makeException({ id: "new1", date: "2026-09-20" }),
    });

    const onSuccess = vi.fn();
    renderSection({ onSuccess });

    fireEvent.click(
      await screen.findByRole("button", { name: "Nova exceção" }),
    );

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Data"), {
      target: { value: "2026-09-20" },
    });
    fireEvent.change(within(dialog).getByLabelText("Início"), {
      target: { value: "14:00" },
    });
    fireEvent.change(within(dialog).getByLabelText("Fim"), {
      target: { value: "15:00" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Criar exceção" }),
    );

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(
      availabilityExceptionApi.getAvailabilityExceptions,
    ).toHaveBeenCalledTimes(2);
  });

  it("permite editar uma exceção ao clicar em Editar", async () => {
    const exception = makeException();
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [exception],
    });
    vi.mocked(availabilityExceptionApi.updateAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: exception,
    });

    const onSuccess = vi.fn();
    renderSection({ onSuccess });

    fireEvent.click(
      await screen.findByRole("button", { name: "Editar" }),
    );

    expect(
      screen.getByRole("heading", { name: "Editar exceção de disponibilidade" }),
    ).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Salvar" }),
    );

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(
      availabilityExceptionApi.updateAvailabilityException,
    ).toHaveBeenCalledWith("exc1", expect.objectContaining({ date: "2026-09-15" }));
  });

  it("oculta de Editar e Excluir conforme permissões", async () => {
    const exception = makeException();
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [exception],
    });

    renderSection({ canUpdate: false, canDelete: false });

    await screen.findByText("15/09/2026");
    const item = screen.getByText("15/09/2026").closest("li")!;
    expect(within(item).queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(within(item).queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument();
    expect(
      availabilityExceptionApi.deleteAvailabilityException,
    ).not.toHaveBeenCalled();
  });

  it("exclui uma exceção após confirmação", async () => {
    const exception = makeException();
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [exception],
    });
    vi.mocked(availabilityExceptionApi.deleteAvailabilityException).mockResolvedValue({
      success: true,
      message: "ok",
      data: null,
    });

    const onSuccess = vi.fn();
    renderSection({ onSuccess });

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Tem certeza que deseja excluir esta exceção?"),
    ).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(
      availabilityExceptionApi.deleteAvailabilityException,
    ).toHaveBeenCalledWith("exc1");
  });

  it("mostra o período e erros do servidor no diálogo de exclusão", async () => {
    const exception = makeException();
    vi.mocked(availabilityExceptionApi.getAvailabilityExceptions).mockResolvedValue({
      success: true,
      message: "ok",
      data: [exception],
    });
    vi.mocked(availabilityExceptionApi.deleteAvailabilityException).mockRejectedValue(
      httpError(409, { message: "Conflito com agendamentos." }),
    );

    renderSection();

    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/10:00 – 11:00/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole("button", { name: "Excluir" }));

    expect(
      await within(dialog).findByRole("alert"),
    ).toHaveTextContent("Conflito com agendamentos.");
    expect(
      availabilityExceptionApi.deleteAvailabilityException,
    ).toHaveBeenCalledWith("exc1");
    expect(
      availabilityExceptionApi.deleteAvailabilityException,
    ).toHaveBeenCalledTimes(1);
  });
});