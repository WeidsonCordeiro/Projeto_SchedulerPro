import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicAppointmentPage from "./PublicAppointmentPage";
import publicAppointmentsApi from "../../api/endpoints/publicAppointments.api";
import { httpError, networkError } from "../../test/http";
import type { PublicAppointment } from "../../types/publicAppointment";

vi.mock("../../api/endpoints/publicAppointments.api", () => ({
  default: {
    getByToken: vi.fn(),
    updateByToken: vi.fn(),
    cancelByToken: vi.fn(),
  },
}));

const TOKEN = "tok-abc-123";

function makeAppointment(
  overrides: Partial<PublicAppointment> = {},
): PublicAppointment {
  return {
    id: "apt1",
    startAt: "2099-10-10T14:30:00.000Z",
    endAt: "2099-10-10T15:00:00.000Z",
    timezone: "Europe/Lisbon",
    status: "scheduled",
    clientName: "Maria Silva",
    service: { id: "svc1", name: "Corte de cabelo" },
    employee: { id: "emp1", name: "João Silva", avatarUrl: null },
    ...overrides,
  };
}

function ok(data: PublicAppointment) {
  return { success: true, message: "ok", data };
}

/**
 * A página é montada sem `Provider` de Redux e sem token em memória: se
 * alguma coisa dependesse da sessão autenticada, isto rebentava.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/agendar" element={<PublicAppointmentPage />} />
        <Route path="/agendar/:token" element={<PublicAppointmentPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function renderLoaded(appointment = makeAppointment()) {
  vi.mocked(publicAppointmentsApi.getByToken).mockResolvedValue(ok(appointment));

  renderAt(`/agendar/${TOKEN}`);

  await screen.findByText("Corte de cabelo");
}

async function openEdit() {
  fireEvent.click(screen.getByRole("button", { name: /alterar agendamento/i }));
  return screen.findByLabelText(/observações/i);
}

describe("PublicAppointmentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  describe("consulta inicial", () => {
    it("pede o agendamento com o token da rota", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockResolvedValue(
        ok(makeAppointment()),
      );

      renderAt(`/agendar/${TOKEN}`);

      await screen.findByText("Corte de cabelo");
      expect(publicAppointmentsApi.getByToken).toHaveBeenCalledWith(TOKEN);
    });

    it("mostra um estado de carregamento sem conteúdo incompleto", () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockReturnValue(
        new Promise(() => {}),
      );

      renderAt(`/agendar/${TOKEN}`);

      expect(screen.getByRole("status")).toBeInTheDocument();
      expect(
        screen.getByText(/a carregar o seu agendamento/i),
      ).toBeInTheDocument();
      expect(screen.queryByText("Corte de cabelo")).toBeNull();
      expect(screen.queryByRole("heading", { name: /serviço/i })).toBeNull();
    });

    it("mostra o agendamento com sucesso", async () => {
      await renderLoaded(
        makeAppointment({
          employee: {
            id: "emp1",
            name: "João Silva",
            avatarUrl: "https://cdn.example/joao.jpg",
          },
        }),
      );

      expect(screen.getByRole("heading", { name: /seu agendamento/i })).toBeInTheDocument();
      expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
      expect(screen.getByText("João Silva")).toBeInTheDocument();
      expect(screen.getByText("Agendado")).toBeInTheDocument();
      expect(document.querySelector("img")).toHaveAttribute(
        "src",
        "https://cdn.example/joao.jpg",
      );
    });

    it("trata 404 sem distinguir a causa e sem oferecer repetição", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockRejectedValue(
        httpError(404, { message: "Agendamento não encontrado." }),
      );

      renderAt(`/agendar/${TOKEN}`);

      expect(
        await screen.findByText("Agendamento não encontrado."),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /tentar novamente/i }),
      ).toBeNull();
    });

    it("trata 429 com uma mensagem de espera e sem detalhe técnico", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockRejectedValue(
        httpError(429, { message: "Demasiadas tentativas de agendamento." }),
      );

      renderAt(`/agendar/${TOKEN}`);

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/demasiadas tentativas/i);
      expect(alert).toHaveTextContent(/aguarde alguns minutos/i);
      expect(alert).not.toHaveTextContent(/429/);
    });

    it("trata 500 com possibilidade de tentar novamente", async () => {
      vi.mocked(publicAppointmentsApi.getByToken)
        .mockRejectedValueOnce(
          httpError(500, { message: "Erro interno do servidor." }),
        )
        .mockResolvedValueOnce(ok(makeAppointment()));

      renderAt(`/agendar/${TOKEN}`);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Erro interno do servidor.",
      );

      fireEvent.click(screen.getByRole("button", { name: /tentar novamente/i }));

      expect(await screen.findByText("Corte de cabelo")).toBeInTheDocument();
    });

    it("trata erro de rede", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockRejectedValue(
        networkError(),
      );

      renderAt(`/agendar/${TOKEN}`);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /não foi possível conectar ao servidor/i,
      );
    });

    it("trata uma rota sem token como link inválido, sem chamar a API", async () => {
      renderAt("/agendar");

      expect(
        await screen.findByText("Link de agendamento inválido."),
      ).toBeInTheDocument();
      expect(publicAppointmentsApi.getByToken).not.toHaveBeenCalled();
    });

    it("não confia num 200 sem agendamento", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockResolvedValue({
        success: true,
        message: "ok",
      });

      renderAt(`/agendar/${TOKEN}`);

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Resposta inválida do servidor.",
      );
    });
  });

  describe("independência de autenticação", () => {
    it("abre sem conta e sem redirecionar para o login", async () => {
      await renderLoaded();

      expect(screen.queryByRole("heading", { name: /entrar/i })).toBeNull();
      expect(
        screen.queryByRole("link", { name: /criar conta/i }),
      ).toBeNull();
    });

    it("não usa o layout autenticado", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockResolvedValue(
        ok(makeAppointment()),
      );

      const { container } = renderAt(`/agendar/${TOKEN}`);
      await screen.findByText("Corte de cabelo");

      expect(container.querySelector(".app-sidebar")).toBeNull();
      expect(container.querySelector(".app-navbar")).toBeNull();
    });

    it("não guarda o token no browser", async () => {
      await renderLoaded();

      expect(window.localStorage.length).toBe(0);
      expect(window.sessionStorage.length).toBe(0);
    });
  });

  describe("alteração", () => {
    it("abre e fecha a edição sem escrever nada", async () => {
      await renderLoaded();

      const field = await openEdit();
      fireEvent.click(screen.getByRole("button", { name: /voltar/i }));

      expect(publicAppointmentsApi.updateByToken).not.toHaveBeenCalled();
      expect(screen.getByText("Corte de cabelo")).toBeInTheDocument();
      expect(field).not.toBeInTheDocument();
    });

    it("envia o PATCH com o token da rota e atualiza com a resposta", async () => {
      const moved = makeAppointment({
        startAt: "2099-11-20T14:30:00.000Z",
        endAt: "2099-11-20T15:00:00.000Z",
      });
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockResolvedValue(
        ok(moved),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Chego mais tarde" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(publicAppointmentsApi.updateByToken).toHaveBeenCalledWith(TOKEN, {
        notes: "Chego mais tarde",
      });
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Agendamento alterado com sucesso.",
      );
      expect(screen.getByText("20/11/2099")).toBeInTheDocument();
      expect(screen.getByText(/20\/11\/2099/)).toBeInTheDocument();
    });

    it("não faz update otimista: a resposta do servidor é a fonte de verdade", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockResolvedValue(
        ok(
          makeAppointment({
            service: { id: "svc2", name: "Barba" },
          }),
        ),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByText("Barba")).toBeInTheDocument();
      expect(screen.queryByText("Corte de cabelo")).toBeNull();
    });

    it("mostra o progresso e bloqueia os controlos durante o PATCH", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockReturnValue(
        new Promise(() => {}),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(screen.getByRole("button", { name: /a guardar/i })).toBeDisabled();
      expect(screen.getByLabelText(/observações/i)).toBeDisabled();
    });

    it("mostra a regra de negócio devolvida em 400 e mantém o texto", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockRejectedValue(
        httpError(400, { message: "Este horário já não está disponível." }),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Este horário já não está disponível.",
      );
      expect(screen.getByLabelText(/observações/i)).toHaveValue("Nota");
    });

    it("bloqueia a edição quando o servidor diz que já não é alterável", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockRejectedValue(
        httpError(400, {
          message: "Este agendamento já não pode ser alterado nem cancelado.",
        }),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /já não pode ser alterado nem cancelado/i,
      );

      fireEvent.click(screen.getByRole("button", { name: /voltar/i }));

      expect(
        screen.queryByRole("button", { name: /alterar agendamento/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /cancelar agendamento/i }),
      ).toBeNull();
    });

    it("trata 404 no PATCH", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockRejectedValue(
        httpError(404, { message: "Agendamento não encontrado." }),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Agendamento não encontrado.",
      );
    });

    it("trata 429 no PATCH", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockRejectedValue(
        httpError(429),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /aguarde alguns minutos/i,
      );
    });

    it("trata 500 no PATCH", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockRejectedValue(
        httpError(500, { message: "Erro interno do servidor." }),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Erro interno do servidor.",
      );
    });

    it("mantém o texto escrito quando a rede falha", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockRejectedValue(
        networkError(),
      );

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Não apague isto" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /não foi possível conectar ao servidor/i,
      );
      expect(screen.getByLabelText(/observações/i)).toHaveValue(
        "Não apague isto",
      );
    });

    it("não aceita um 200 do PATCH sem agendamento e mantém o formulário", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.updateByToken).mockResolvedValue({
        success: true,
        message: "ok",
      });

      const field = await openEdit();
      fireEvent.change(field, { target: { value: "Nota" } });
      fireEvent.click(
        screen.getByRole("button", { name: /guardar alterações/i }),
      );

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Resposta inválida do servidor.",
      );
      expect(screen.getByRole("form", { name: /alterar agendamento/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/observações/i)).toHaveValue("Nota");
    });
  });

  describe("cancelamento", () => {
    async function openCancel() {
      fireEvent.click(
        screen.getByRole("button", { name: /cancelar agendamento/i }),
      );
      return screen.findByRole("dialog", { name: /cancelar agendamento/i });
    }

    it("pede confirmação e não apaga nada ao abrir", async () => {
      await renderLoaded();

      const dialog = await openCancel();

      expect(dialog).toBeInTheDocument();
      expect(publicAppointmentsApi.cancelByToken).not.toHaveBeenCalled();
      // O resumo continua visível atrás da confirmação.
      expect(screen.getAllByText("Corte de cabelo")).toHaveLength(2);
    });

    it("não chama a API quando a pessoa desiste", async () => {
      await renderLoaded();
      await openCancel();

      fireEvent.click(
        screen.getByRole("button", { name: /manter agendamento/i }),
      );

      expect(publicAppointmentsApi.cancelByToken).not.toHaveBeenCalled();
      expect(
        screen.getByRole("button", { name: /alterar agendamento/i }),
      ).toBeInTheDocument();
    });

    it("cancela depois da confirmação e entra em estado final", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.cancelByToken).mockResolvedValue(
        ok(makeAppointment({ status: "cancelled" })),
      );

      await openCancel();
      fireEvent.click(screen.getByRole("button", { name: /sim, cancelar/i }));

      expect(publicAppointmentsApi.cancelByToken).toHaveBeenCalledWith(TOKEN);
      expect(await screen.findByRole("status")).toHaveTextContent(
        "Agendamento cancelado.",
      );
      expect(screen.getByText("Cancelado")).toBeInTheDocument();
      expect(screen.getByText("Este agendamento está cancelado.")).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: /alterar agendamento/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /cancelar agendamento/i }),
      ).toBeNull();
    });

    it("aceita a resposta idempotente de um agendamento já cancelado", async () => {
      await renderLoaded(makeAppointment({ status: "cancelled" }));
      expect(
        screen.queryByRole("button", { name: /cancelar agendamento/i }),
      ).toBeNull();

      expect(publicAppointmentsApi.cancelByToken).not.toHaveBeenCalled();
      expect(screen.getByText("Este agendamento está cancelado.")).toBeInTheDocument();
    });

    it.each([
      ["404", httpError(404, { message: "Agendamento não encontrado." }), /agendamento não encontrado/i],
      ["429", httpError(429), /aguarde alguns minutos/i],
      ["500", httpError(500, { message: "Erro interno do servidor." }), /erro interno do servidor/i],
      ["rede", networkError(), /não foi possível conectar ao servidor/i],
    ])("trata %s no cancelamento sem fechar a caixa", async (_case, error, expected) => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.cancelByToken).mockRejectedValue(error);

      await openCancel();
      fireEvent.click(screen.getByRole("button", { name: /sim, cancelar/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(expected);
      expect(
        screen.getByRole("dialog", { name: /cancelar agendamento/i }),
      ).toBeInTheDocument();
    });

    it("não aceita um 200 do cancelamento sem agendamento", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.cancelByToken).mockResolvedValue({
        success: true,
        message: "ok",
      });

      await openCancel();
      fireEvent.click(screen.getByRole("button", { name: /sim, cancelar/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Resposta inválida do servidor.",
      );
      expect(
        screen.getByRole("dialog", { name: /cancelar agendamento/i }),
      ).toBeInTheDocument();
    });

    it("bloqueia o cancelamento quando o servidor diz que já não é possível", async () => {
      await renderLoaded();
      vi.mocked(publicAppointmentsApi.cancelByToken).mockRejectedValue(
        httpError(400, {
          message: "Este agendamento já não pode ser alterado nem cancelado.",
        }),
      );

      await openCancel();
      fireEvent.click(screen.getByRole("button", { name: /sim, cancelar/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /já não pode ser alterado nem cancelado/i,
      );

      fireEvent.click(
        screen.getByRole("button", { name: /manter agendamento/i }),
      );

      expect(
        screen.queryByRole("button", { name: /alterar agendamento/i }),
      ).toBeNull();
      expect(
        screen.queryByRole("button", { name: /cancelar agendamento/i }),
      ).toBeNull();
    });
  });

  describe("agendamentos que já não são editáveis", () => {
    it.each(["completed", "no-show"] as const)(
      "mostra %s apenas para leitura",
      async (status) => {
        await renderLoaded(makeAppointment({ status }));

        expect(
          screen.queryByRole("button", { name: /alterar agendamento/i }),
        ).toBeNull();
        expect(
          screen.queryByRole("button", { name: /cancelar agendamento/i }),
        ).toBeNull();
        expect(
          screen.getByText(/já terminou e não pode ser alterado/i),
        ).toBeInTheDocument();
      },
    );

    it("mostra em leitura quando o agendamento já começou", async () => {
      await renderLoaded(
        makeAppointment({ startAt: "2000-01-01T10:00:00.000Z" }),
      );

      expect(
        screen.queryByRole("button", { name: /alterar agendamento/i }),
      ).toBeNull();
      expect(
        screen.getByText(/já não pode ser alterado nem cancelado/i),
      ).toBeInTheDocument();
    });
  });

  describe("acessibilidade", () => {
    it("expõe a identidade do produto e um único landmark principal", async () => {
      await renderLoaded();

      expect(screen.getByText("SchedulerPro")).toBeInTheDocument();
      expect(screen.getAllByRole("main")).toHaveLength(1);
    });

    it("associa a mensagem de erro a um alerta", async () => {
      vi.mocked(publicAppointmentsApi.getByToken).mockRejectedValue(
        httpError(500),
      );

      renderAt(`/agendar/${TOKEN}`);

      expect(await screen.findByRole("alert")).toBeInTheDocument();
    });

    it("move o foco para a edição quando ela substitui o resumo", async () => {
      await renderLoaded();

      await openEdit();

      expect(
        screen.getByRole("form", { name: /alterar agendamento/i }),
      ).toHaveFocus();
    });
  });
});
