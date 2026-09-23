import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NotificationBell from "./NotificationBell";
import notificationsApi from "../../api/endpoints/notifications.api";
import { httpError } from "../../test/http";
import authReducer from "../../store/slices/authSlice";
import type { Role } from "../../types/auth";
import type { Notification, NotificationType } from "../../types/notification";

vi.mock("../../api/endpoints/notifications.api", () => ({
  default: {
    getNotifications: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
  },
}));

const user = {
  id: "507f1f77bcf86cd799439011",
  name: "Owner Teste",
  email: "owner@example.com",
  avatar: null,
  role: "OWNER" as Role,
  companyId: "507f1f77bcf86cd799439012",
  isActive: true,
};

const notification = (extra: Partial<Notification> = {}): Notification => ({
  id: "507f1f77bcf86cd799439015",
  companyId: "507f1f77bcf86cd799439012",
  userId: "507f1f77bcf86cd799439011",
  type: "APPOINTMENT_CREATED" as NotificationType,
  title: "Novo agendamento",
  message: "Maria — Corte em 30/08/2026 às 18:00.",
  readAt: null,
  metadata: {
    appointmentId: null,
    clientId: null,
    serviceId: null,
    employeeId: null,
  },
  createdAt: "2026-08-30T18:00:00.000Z",
  updatedAt: "2026-08-30T18:00:00.000Z",
  ...extra,
});

function makeStore(role: Role = "OWNER") {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: { ...user, role },
        mustChangePassword: false,
        isAuthenticated: true,
        isInitializing: false,
        isLoading: false,
      },
    },
  });
}

function renderBell(store = makeStore()) {
  return render(
    <Provider store={store}>
      <NotificationBell />
    </Provider>,
  );
}

describe("NotificationBell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({
      success: true,
      message: "ok",
      data: { unreadCount: 0 },
    });
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [],
    });
    vi.mocked(notificationsApi.markAsRead).mockResolvedValue({
      success: true,
      message: "ok",
      data: notification({ readAt: "2026-08-30T19:00:00.000Z" }),
    });
    vi.mocked(notificationsApi.markAllAsRead).mockResolvedValue({
      success: true,
      message: "ok",
      data: { markedRead: 1 },
    });
  });

  it("não renderiza para utilizadores CLIENT", () => {
    renderBell(makeStore("CLIENT"));

    expect(
      screen.queryByRole("button", { name: /notificações/i }),
    ).not.toBeInTheDocument();
  });

  it("ameixa o badge quando existem não lidas", async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockResolvedValue({
      success: true,
      message: "ok",
      data: { unreadCount: 3 },
    });

    renderBell();

    expect(
      await screen.findByTestId("notification-badge"),
    ).toHaveTextContent("3");
  });

  it("não ameixa o badge quando não há não lidas", async () => {
    renderBell();

    await waitFor(() => {
      expect(notificationsApi.getUnreadCount).toHaveBeenCalled();
    });

    expect(
      screen.queryByTestId("notification-badge"),
    ).not.toBeInTheDocument();
  });

  it("ignora falha ao carregar a contagem de não lidas", async () => {
    vi.mocked(notificationsApi.getUnreadCount).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderBell();

    await waitFor(() => {
      expect(notificationsApi.getUnreadCount).toHaveBeenCalled();
    });

    expect(
      screen.queryByTestId("notification-badge"),
    ).not.toBeInTheDocument();
  });

  it("abre o dropdown e lista as notificações", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [notification()],
    });

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(
      await screen.findByText("Maria — Corte em 30/08/2026 às 18:00."),
    ).toBeInTheDocument();
    expect(notificationsApi.getNotifications).toHaveBeenCalled();
  });

  it("mostra estado vazio quando não há notificações", async () => {
    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(await screen.findByText("Sem notificações.")).toBeInTheDocument();
  });

  it("marca uma notificação individual como lida", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [notification()],
    });

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    const item = await screen.findByText(
      "Maria — Corte em 30/08/2026 às 18:00.",
    );
    fireEvent.click(item);

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalledWith(
        "507f1f77bcf86cd799439015",
      );
    });
  });

  it("ignora clique em notificação já lida", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [notification({ readAt: "2026-08-30T19:00:00.000Z" })],
    });

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    fireEvent.click(
      await screen.findByText("Maria — Corte em 30/08/2026 às 18:00."),
    );

    expect(notificationsApi.markAsRead).not.toHaveBeenCalled();
  });

  it("reverte a leitura quando a API falha ao marcar individualmente", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [notification()],
    });
    vi.mocked(notificationsApi.markAsRead).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    fireEvent.click(
      await screen.findByText("Maria — Corte em 30/08/2026 às 18:00."),
    );

    await waitFor(() => {
      expect(notificationsApi.markAsRead).toHaveBeenCalled();
    });
    expect(
      await screen.findByTestId("notification-badge"),
    ).toHaveTextContent("1");
  });

  it("marca todas como lidas", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [
        notification(),
        notification({
          id: "507f1f77bcf86cd799439016",
          title: "Agendamento cancelado",
          message: "Ana — Corte em 31/08/2026 às 09:00.",
        }),
      ],
    });

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    fireEvent.click(
      await screen.findByRole("button", { name: /marcar todas como lidas/i }),
    );

    await waitFor(() => {
      expect(notificationsApi.markAllAsRead).toHaveBeenCalledTimes(1);
    });
    expect(
      screen.queryByRole("button", { name: /marcar todas como lidas/i }),
    ).not.toBeInTheDocument();
  });

  it("mostra erro quando a listagem falha", async () => {
    vi.mocked(notificationsApi.getNotifications).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(
      await screen.findByText("Não foi possível carregar as notificações."),
    ).toBeInTheDocument();
  });

  it("mostra erro quando falha ao marcar todas como lidas", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [notification()],
    });
    vi.mocked(notificationsApi.markAllAsRead).mockRejectedValue(
      httpError(500, { message: "Erro interno do servidor." }),
    );

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    fireEvent.click(
      await screen.findByRole("button", { name: /marcar todas como lidas/i }),
    );

    expect(
      await screen.findByText(
        "Não foi possível marcar as notificações como lidas.",
      ),
    ).toBeInTheDocument();
  });

  it("mostra estado de carga ao marcar todas como lidas", async () => {
    vi.mocked(notificationsApi.getNotifications).mockResolvedValue({
      success: true,
      message: "ok",
      data: [notification()],
    });
    let resolveMarkAll!: (
      value: { success: boolean; message: string; data?: { markedRead: number } },
    ) => void;
    vi.mocked(notificationsApi.markAllAsRead).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMarkAll = resolve;
        }),
    );

    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    fireEvent.click(
      await screen.findByRole("button", { name: /marcar todas como lidas/i }),
    );

    expect(
      await screen.findByRole("button", { name: /a marcar\.\.\./i }),
    ).toBeDisabled();

    resolveMarkAll({ success: true, message: "ok", data: { markedRead: 1 } });
  });

  it("fecha o dropdown ao clicar fora", async () => {
    renderBell();

    fireEvent.click(screen.getByRole("button", { name: /notificações/i }));

    expect(
      await screen.findByText("Sem notificações."),
    ).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(
        screen.queryByText("Sem notificações."),
      ).not.toBeInTheDocument();
    });
  });
});