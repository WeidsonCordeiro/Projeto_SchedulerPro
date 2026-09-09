import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ServiceForm from "./ServiceForm";
import servicesApi from "../../api/endpoints/services.api";
import { httpError, networkError } from "../../test/http";
import type { Service } from "../../types/service";

vi.mock("../../api/endpoints/services.api", () => ({
  default: {
    createService: vi.fn(),
    updateService: vi.fn(),
  },
}));

const existingService: Service = {
  id: "abc123",
  name: "Corte de cabelo",
  description: "Corte simples com lavagem",
  duration: 30,
  price: 15.5,
  companyId: "company1",
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderForm(props: Partial<Parameters<typeof ServiceForm>[0]> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(
    <ServiceForm
      isOpen
      service={null}
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { onClose, onSaved };
}

function fillForm({
  name = "Barba",
  description = "",
  duration = "30",
  price = "20",
}: {
  name?: string;
  description?: string;
  duration?: string;
  price?: string;
} = {}) {
  fireEvent.change(screen.getByLabelText("Nome"), {
    target: { value: name },
  });
  fireEvent.change(screen.getByLabelText("Descrição"), {
    target: { value: description },
  });
  fireEvent.change(screen.getByLabelText("Duração (minutos)"), {
    target: { value: duration },
  });
  fireEvent.change(screen.getByLabelText("Preço"), {
    target: { value: price },
  });
}

describe("ServiceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when closed", () => {
    render(
      <ServiceForm
        isOpen={false}
        service={null}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders the create form when no service is provided", () => {
    renderForm();
    expect(screen.getByRole("heading", { name: "Novo serviço" })).toBeInTheDocument();
  });

  it("renders the edit form pre-filled when a service is provided", () => {
    renderForm({ service: existingService });
    expect(screen.getByRole("heading", { name: "Editar serviço" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nome")).toHaveValue("Corte de cabelo");
    expect(screen.getByLabelText("Descrição")).toHaveValue("Corte simples com lavagem");
    expect(screen.getByLabelText("Duração (minutos)")).toHaveValue(30);
    expect(screen.getByLabelText("Preço")).toHaveValue(15.5);
  });

  it("validates required fields without calling the API", () => {
    renderForm();
    fillForm({ name: "", duration: "", price: "" });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(screen.getByText("O nome do serviço é obrigatório.")).toBeInTheDocument();
    expect(screen.getByText("A duração do serviço é obrigatória.")).toBeInTheDocument();
    expect(screen.getByText("O preço do serviço é obrigatório.")).toBeInTheDocument();
    expect(servicesApi.createService).not.toHaveBeenCalled();
  });

  it("rejects a short name", () => {
    renderForm();
    fillForm({ name: "A" });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(
      screen.getByText("O nome deve ter entre 2 e 100 caracteres."),
    ).toBeInTheDocument();
    expect(servicesApi.createService).not.toHaveBeenCalled();
  });

  it("rejects a description longer than 500 characters", () => {
    renderForm();
    fillForm({ description: "x".repeat(501) });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(
      screen.getByText("A descrição deve ter no máximo 500 caracteres."),
    ).toBeInTheDocument();
    expect(servicesApi.createService).not.toHaveBeenCalled();
  });

  it("rejects a duration that is not an integer or is below the minimum", () => {
    renderForm();
    fillForm({ duration: "3" });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(
      screen.getByText(
        "A duração deve ser um número inteiro maior ou igual a 5 minutos.",
      ),
    ).toBeInTheDocument();
    expect(servicesApi.createService).not.toHaveBeenCalled();
  });

  it("rejects a negative price", () => {
    renderForm();
    fillForm({ price: "-1" });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(
      screen.getByText("O preço deve ser um número maior ou igual a zero."),
    ).toBeInTheDocument();
    expect(servicesApi.createService).not.toHaveBeenCalled();
  });

  it("shows a field error once and removes it after the submit retry succeeds", async () => {
    vi.mocked(servicesApi.createService).mockResolvedValue({
      success: true,
      message: "Serviço criado com sucesso.",
      data: existingService,
    });

    const { onSaved, onClose } = renderForm();
    fillForm({ name: "", duration: "30", price: "20" });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));
    expect(
      screen.getByText("O nome do serviço é obrigatório."),
    ).toBeInTheDocument();

    fillForm({ name: "Barba", duration: "30", price: "20" });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(servicesApi.createService).toHaveBeenCalledWith({
      name: "Barba",
      description: undefined,
      duration: 30,
      price: 20,
    });
    expect(onSaved).toHaveBeenCalledWith(existingService);
  });

  it("calls createService with a trimmed and normalized payload on success", async () => {
    vi.mocked(servicesApi.createService).mockResolvedValue({
      success: true,
      message: "Serviço criado com sucesso.",
      data: existingService,
    });

    const { onSaved, onClose } = renderForm();
    fillForm({
      name: "  Corte de cabelo  ",
      description: "  ",
      duration: "30",
      price: "10.75",
    });
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(servicesApi.createService).toHaveBeenCalledWith({
      name: "Corte de cabelo",
      description: undefined,
      duration: 30,
      price: 10.75,
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("calls updateService in edit mode", async () => {
    vi.mocked(servicesApi.updateService).mockResolvedValue({
      success: true,
      message: "Serviço atualizado com sucesso.",
      data: { ...existingService, duration: 45, price: 20 },
    });

    const { onSaved, onClose } = renderForm({ service: existingService });
    fireEvent.change(screen.getByLabelText("Duração (minutos)"), {
      target: { value: "45" },
    });
    fireEvent.change(screen.getByLabelText("Preço"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getByRole("button", { name: /salvar/i }));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(servicesApi.updateService).toHaveBeenCalledWith("abc123", {
      name: "Corte de cabelo",
      description: "Corte simples com lavagem",
      duration: 45,
      price: 20,
    });
    expect(onSaved).toHaveBeenCalled();
  });

  it("shows server validation messages coming from the API body", async () => {
    vi.mocked(servicesApi.createService).mockRejectedValue(
      httpError(400, {
        message: "Dados inválidos.",
        errors: [{ field: "name", message: "Nome já cadastrado." }],
      }),
    );

    renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Dados inválidos.",
    );
  });

  it("stays open and re-enables the button after a server error", async () => {
    vi.mocked(servicesApi.createService).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    const { onClose } = renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Erro interno do servidor.",
    );
    expect(screen.getByRole("button", { name: /criar serviço/i })).toBeEnabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shows a friendly message on network errors", async () => {
    vi.mocked(servicesApi.createService).mockRejectedValue(networkError());

    renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Não foi possível conectar ao servidor. Verifique sua conexão.",
    );
  });

  it("shows loading, blocks duplicate submits and disables cancel while pending", async () => {
    let resolveRequest: (value: {
      success: boolean;
      message: string;
      data: Service;
    }) => void = () => {};
    vi.mocked(servicesApi.createService).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { onClose } = renderForm();
    fillForm();
    fireEvent.click(screen.getByRole("button", { name: /criar serviço/i }));

    const submittingButton = screen.getByRole("button", { name: /criando/i });
    expect(submittingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();

    fireEvent.click(submittingButton);
    expect(servicesApi.createService).toHaveBeenCalledTimes(1);

    resolveRequest({
      success: true,
      message: "ok",
      data: existingService,
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
});