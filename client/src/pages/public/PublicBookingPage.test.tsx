import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PublicBookingPage from "./PublicBookingPage";
import publicBookingApi from "../../api/endpoints/publicBooking.api";
import { httpError, networkError } from "../../test/http";
import { getTodayDateKey } from "../../config/publicBooking";
import type { PublicAppointment } from "../../types/publicAppointment";
import type { CreatePublicAppointmentResult } from "../../types/publicBooking";

vi.mock("../../api/endpoints/publicBooking.api", () => ({
  default: {
    getServices: vi.fn(),
    getEmployees: vi.fn(),
    getAvailability: vi.fn(),
    createAppointment: vi.fn(),
  },
}));

const mockApi = vi.mocked(publicBookingApi);

const COMPANY_ID = "company1";

const services = [
  { id: "svc1", name: "Corte de cabelo", description: null, durationMinutes: 45, price: 25 },
];

const employees = [{ id: "emp1", name: "João Silva", avatarUrl: null }];

const availability = {
  date: "2026-10-08",
  timezone: "Europe/Lisbon",
  slots: [
    { startAt: "2026-10-08T09:00:00.000+01:00", endAt: "2026-10-08T09:45:00.000+01:00" },
  ],
};

const createdAppointment: PublicAppointment = {
  id: "apt1",
  startAt: "2026-10-08T08:00:00.000Z",
  endAt: "2026-10-08T08:45:00.000Z",
  status: "scheduled",
  clientName: "Maria Silva",
  service: { id: "svc1", name: "Corte de cabelo" },
  employee: { id: "emp1", name: "João Silva", avatarUrl: null },
};

/** Data de amanhã, para o `min` do input nunca colidir com o valor inicial. */
const DAY = getTodayDateKey("Europe/Lisbon");

function renderPage(path = `/agendar/empresa/${COMPANY_ID}`) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/agendar/empresa/:companyId" element={<PublicBookingPage />} />
        <Route
          path="/agendar/:token"
          element={<p>token {new URLSearchParams(window.location.search).get("t")}</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

/**
 * Leva o utilizador da entrada até ao ecrã de revisão.
 *
 * Percorre as etapas pela interface (cliques e escritas), não por manipulação
 * de estado: só assim se prova que o caminho real do utilizador chega lá.
 */
async function fillUpToReview() {
  fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
  fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));
  fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
  fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
  fireEvent.change(await screen.findByLabelText(/^Nome/), {
    target: { value: "Maria Silva" },
  });
  fireEvent.change(screen.getByLabelText(/^E-mail/), {
    target: { value: "maria@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
  return screen.findByRole("button", { name: "Confirmar agendamento" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApi.getServices.mockResolvedValue(services);
  mockApi.getEmployees.mockResolvedValue(employees);
  mockApi.getAvailability.mockResolvedValue({
    date: DAY,
    timezone: "Europe/Lisbon",
    slots: availability.slots,
  });
});

describe("PublicBookingPage", () => {
  describe("catálogo", () => {
    it("loads services and employees on mount, in parallel", async () => {
      renderPage();

      expect(await screen.findByText("Corte de cabelo")).toBeInTheDocument();
      expect(mockApi.getServices).toHaveBeenCalledWith(COMPANY_ID);
      expect(mockApi.getEmployees).toHaveBeenCalledWith(COMPANY_ID);
      // Ambos sem esperar um pelo outro: a lista de profissionais não depende
      // da escolha de serviço.
      expect(mockApi.getServices.mock.invocationCallOrder[0]).toBeLessThan(
        mockApi.getEmployees.mock.invocationCallOrder[0],
      );
    });

    it("shows a loading state per section, not one for the whole page", async () => {
      let resolveServices: (value: typeof services) => void = () => {};
      mockApi.getServices.mockReturnValue(
        new Promise((resolve) => {
          resolveServices = resolve;
        }),
      );

      renderPage();

      expect(screen.getByRole("status")).toHaveTextContent("A carregar serviços…");
      // O título da página já está visível: não há bloqueio total.
      expect(
        screen.getByRole("heading", { name: "Marcar atendimento" }),
      ).toBeInTheDocument();

      resolveServices(services);
      await screen.findByText("Corte de cabelo");
    });

    it("shows the empty message when the company has no services", async () => {
      mockApi.getServices.mockResolvedValue([]);

      renderPage();

      expect(
        await screen.findByText(
          "No momento não existem serviços disponíveis para agendamento.",
        ),
      ).toBeInTheDocument();
    });

    it("offers a retry when the catalog fails", async () => {
      mockApi.getServices.mockRejectedValue(httpError(500));
      renderPage();
      await screen.findByRole("alert");

      mockApi.getServices.mockResolvedValue(services);
      fireEvent.click(screen.getByRole("button", { name: /Tentar novamente/ }));

      expect(await screen.findByText("Corte de cabelo")).toBeInTheDocument();
    });
  });

  describe("disponibilidade", () => {
    it("requests availability with the calendar date, not an instant", async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));

      await waitFor(() => expect(mockApi.getAvailability).toHaveBeenCalled());

      const [companyId, query] = mockApi.getAvailability.mock.calls[0];
      expect(companyId).toBe(COMPANY_ID);
      expect(query.serviceId).toBe("svc1");
      expect(query.employeeId).toBe("emp1");
      expect(query.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(query.date).not.toContain("T");
    });

    it("refetches when the professional changes", async () => {
      // O segundo profissional tem de existir ANTES do mount: a lista é
      // carregada uma vez e trocá-la depois seria um teste do mock, não do
      // comportamento.
      mockApi.getEmployees.mockResolvedValue([
        employees[0],
        { id: "emp2", name: "Ana Costa", avatarUrl: null },
      ]);

      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));
      await waitFor(() => expect(mockApi.getAvailability).toHaveBeenCalledTimes(1));

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      fireEvent.click(await screen.findByRole("radio", { name: /Ana Costa/ }));

      await waitFor(() => expect(mockApi.getAvailability).toHaveBeenCalledTimes(2));
      expect(mockApi.getAvailability.mock.calls[1][1].employeeId).toBe("emp2");
    });

    it("shows the empty state when the day has no slots", async () => {
      mockApi.getAvailability.mockResolvedValue({
        date: DAY,
        timezone: "Europe/Lisbon",
        slots: [],
      });

      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));

      expect(
        await screen.findByText(
          "Não existem horários disponíveis para esta data. Escolha outra data.",
        ),
      ).toBeInTheDocument();
    });

    it("does not let the user continue without a slot", async () => {
      mockApi.getAvailability.mockResolvedValue({
        date: DAY,
        timezone: "Europe/Lisbon",
        slots: [],
      });

      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));
      await screen.findByText(/Escolha outra data/);

      expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
    });
  });

  describe("criação", () => {
    it("posts only the public contract fields, with startAt verbatim", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok-123",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await waitFor(() => expect(mockApi.createAppointment).toHaveBeenCalled());

      const [companyId, payload] = mockApi.createAppointment.mock.calls[0];
      expect(companyId).toBe(COMPANY_ID);
      expect(Object.keys(payload).sort()).toEqual([
        "clientEmail",
        "clientName",
        "employeeId",
        "serviceId",
        "startAt",
      ]);
      // O instante devolvido pela disponibilidade, com deslocamento e sem
      // qualquer reconstrução.
      expect(payload.startAt).toBe(availability.slots[0].startAt);
    });

    it("omits the optional fields when the user left them empty", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok-123",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await waitFor(() => expect(mockApi.createAppointment).toHaveBeenCalled());
      const payload = mockApi.createAppointment.mock.calls[0][1];

      expect("clientPhone" in payload).toBe(false);
      expect("notes" in payload).toBe(false);
    });

    it("shows the confirmation with the token link on success", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok-123",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      expect(
        await screen.findByRole("heading", { name: "Agendamento confirmado" }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /Abrir agendamento/ }),
      ).toHaveAttribute("href", "/agendar/tok-123");
    });

    it("hides the form once the booking is confirmed", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok-123",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await screen.findByRole("heading", { name: "Agendamento confirmado" });
      expect(screen.queryByLabelText(/^Nome/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole("navigation", { name: /Etapas/ }),
      ).not.toBeInTheDocument();
    });

    it("blocks a second submission while the first is in flight", async () => {
      let resolveCreate: (
        value: CreatePublicAppointmentResult,
      ) => void = () => {};
      mockApi.createAppointment.mockReturnValue(
        new Promise((resolve) => {
          resolveCreate = resolve;
        }),
      );

      renderPage();
      await fillUpToReview();

      const confirm = screen.getByRole("button", { name: "Confirmar agendamento" });
      fireEvent.click(confirm);
      fireEvent.click(screen.getByRole("button", { name: /A confirmar/ }));

      expect(mockApi.createAppointment).toHaveBeenCalledTimes(1);
      resolveCreate({
        appointment: createdAppointment,
        publicAccessToken: "tok",
      });
    });

    it("restarts the flow cleanly", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok-123",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));
      await screen.findByRole("heading", { name: "Agendamento confirmado" });

      fireEvent.click(screen.getByRole("button", { name: "Fazer novo agendamento" }));

      // Volta à etapa 1, com o formulário de dados descartado e nenhuma
      // escolha herdada do agendamento anterior.
      expect(await screen.findByText("Corte de cabelo")).toBeInTheDocument();
      expect(screen.getByRole("radio", { name: /Corte de cabelo/ })).not.toBeChecked();
      expect(screen.queryByLabelText(/^Nome/)).not.toBeInTheDocument();
      expect(
        screen.getByRole("navigation", { name: /Etapas do agendamento/ }),
      ).toBeInTheDocument();
    });
  });

  describe("409 — o horário foi ocupado entretanto", () => {
    beforeEach(() => {
      mockApi.createAppointment.mockRejectedValue(httpError(409));
    });

    it("tells the user what happened and asks for another slot", async () => {
      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      expect(
        await screen.findByText(
          "Esse horário acabou de ser ocupado. Escolha outro horário disponível.",
        ),
      ).toBeInTheDocument();
    });

    it("returns to the schedule step", async () => {
      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      // Está na etapa da data, não na de revisão: o ecrã de confirmação sumiu.
      expect(
        await screen.findByRole("heading", { name: "Data e hora" }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "Confirmar agendamento" }),
      ).not.toBeInTheDocument();
    });

    it("reloads the availability for the same day", async () => {
      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await waitFor(() =>
        expect(mockApi.getAvailability).toHaveBeenCalledTimes(2),
      );
      expect(mockApi.getAvailability.mock.calls[1][1]).toEqual(
        mockApi.getAvailability.mock.calls[0][1],
      );
    });

    it("clears the slot that was taken, so it cannot be resubmitted", async () => {
      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await waitFor(() =>
        expect(mockApi.getAvailability).toHaveBeenCalledTimes(2),
      );
      expect(screen.getByRole("button", { name: "09:00" })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    });

    it("keeps the data the customer already typed", async () => {
      renderPage();
      await fillUpToReview();

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      expect(screen.getByLabelText(/^Nome/)).toHaveValue("Maria Silva");
      expect(screen.getByLabelText(/^E-mail/)).toHaveValue("maria@example.com");

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
      expect(screen.getByLabelText(/^Nome/)).toHaveValue("Maria Silva");
    });

    it("does not retry automatically", async () => {
      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await waitFor(() =>
        expect(mockApi.getAvailability).toHaveBeenCalledTimes(2),
      );
      // Uma submissão, um 409, e a decisão passa a ser do utilizador.
      expect(mockApi.createAppointment).toHaveBeenCalledTimes(1);
    });
  });

  describe("outras falhas", () => {
    it("explains a rate limit and does not retry", async () => {
      mockApi.createAppointment.mockRejectedValue(httpError(429));

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      expect(
        await screen.findByText(/Demasiadas tentativas/i),
      ).toBeInTheDocument();
      expect(mockApi.createAppointment).toHaveBeenCalledTimes(1);
    });

    it("keeps the user on the review step when the booking was not created", async () => {
      mockApi.createAppointment.mockRejectedValue(httpError(500));

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      expect(
        await screen.findByText(/Não foi possível concluir o agendamento/i),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Confirmar agendamento" }),
      ).toBeEnabled();
    });

    it("treats a network failure as a failure, not as a success", async () => {
      mockApi.createAppointment.mockRejectedValue(networkError());

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(
        screen.queryByRole("heading", { name: "Agendamento confirmado" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("navegação entre etapas", () => {
    it("volta da etapa do profissional para a do serviço, mantendo o serviço", async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      // Escolher o serviço avança sozinho para a etapa do profissional.
      await screen.findByRole("radio", { name: /João Silva/ });

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

      // Volta ao serviço, e a escolha fica assinalada para não ter de a repetir.
      expect(
        await screen.findByRole("radio", { name: /Corte de cabelo/ }),
      ).toBeChecked();
    });

    it("volta da etapa da data para a do profissional, mantendo o profissional", async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));
      await screen.findByRole("button", { name: "09:00" });

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));

      expect(
        await screen.findByRole("radio", { name: /João Silva/ }),
      ).toBeChecked();
    });

    it("descarta o horário escolhido ao mudar de dia", async () => {
      renderPage();
      fireEvent.click(await screen.findByRole("radio", { name: /Corte de cabelo/ }));
      fireEvent.click(await screen.findByRole("radio", { name: /João Silva/ }));
      fireEvent.click(await screen.findByRole("button", { name: "09:00" }));
      expect(screen.getByRole("button", { name: "Continuar" })).toBeEnabled();

      fireEvent.change(screen.getByLabelText("Data"), {
        target: { value: "2099-12-25" },
      });

      // O horário era do dia anterior; não pode sobreviver à mudança de dia.
      expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
      await waitFor(() =>
        expect(mockApi.getAvailability.mock.calls[1][1].date).toBe("2099-12-25"),
      );
    });
  });

  describe("segurança e contrato", () => {
    it("does not send the companyId in the body", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));

      await waitFor(() => expect(mockApi.createAppointment).toHaveBeenCalled());
      expect(mockApi.createAppointment.mock.calls[0][1]).not.toHaveProperty(
        "companyId",
      );
    });

    it("never stores the token", async () => {
      mockApi.createAppointment.mockResolvedValue({
        appointment: createdAppointment,
        publicAccessToken: "tok-secret-abc",
      });

      renderPage();
      await fillUpToReview();
      fireEvent.click(screen.getByRole("button", { name: "Confirmar agendamento" }));
      await screen.findByRole("heading", { name: "Agendamento confirmado" });

      expect(JSON.stringify(window.localStorage)).not.toContain("tok-secret-abc");
      expect(JSON.stringify(window.sessionStorage)).not.toContain("tok-secret-abc");
      expect(document.cookie).not.toContain("tok-secret-abc");
    });

    it("calls only the public API, never the authenticated one", async () => {
      renderPage();
      await fillUpToReview();

      const used = [
        mockApi.getServices.mock.invocationCallOrder,
        mockApi.getEmployees.mock.invocationCallOrder,
        mockApi.getAvailability.mock.invocationCallOrder,
      ]
        .flat()
        .filter((value): value is number => typeof value === "number");

      expect(used.length).toBeGreaterThan(0);
      expect(screen.queryByText(/entrar|login|iniciar sessão/i)).not.toBeInTheDocument();
    });
  });
});