import { useEffect, useRef, useState } from "react";
import notificationsApi from "../../api/endpoints/notifications.api";
import { useAppSelector } from "../../store";
import type { Notification } from "../../types/notification";

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat("pt-PT", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NotificationBell() {
  const user = useAppSelector((state) => state.auth.user);
  const isClient = user?.role === "CLIENT";

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || isClient) {
      return;
    }

    let cancelled = false;

    notificationsApi
      .getUnreadCount()
      .then((response) => {
        if (!cancelled) {
          setUnreadCount(response.data?.unreadCount ?? 0);
        }
      })
      .catch(() => {
        // Erro de contagem não deve quebrar a interface; fica sem badge.
      });

    return () => {
      cancelled = true;
    };
  }, [user, isClient]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function loadNotifications() {
    setLoading(true);
    setError(null);
    try {
      const response = await notificationsApi.getNotifications();
      setNotifications(response.data ?? []);
      const unread = response.data?.filter((item) => !item.readAt).length ?? 0;
      setUnreadCount(unread);
    } catch {
      setError("Não foi possível carregar as notificações.");
    } finally {
      setLoading(false);
    }
  }

  function handleToggle() {
    if (!open) {
      void loadNotifications();
    }
    setOpen((current) => !current);
  }

  async function handleMarkAsRead(notification: Notification) {
    if (notification.readAt) {
      return;
    }

    setNotifications((current) =>
      current.map((item) =>
        item.id === notification.id
          ? { ...item, readAt: new Date().toISOString() }
          : item,
      ),
    );
    setUnreadCount((current) => Math.max(0, current - 1));

    try {
      await notificationsApi.markAsRead(notification.id);
    } catch {
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? { ...item, readAt: notification.readAt }
            : item,
        ),
      );
      setUnreadCount((current) => current + 1);
    }
  }

  async function handleMarkAllAsRead() {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllAsRead();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          readAt: new Date().toISOString(),
        })),
      );
      setUnreadCount(0);
    } catch {
      setError("Não foi possível marcar as notificações como lidas.");
    } finally {
      setMarkingAll(false);
    }
  }

  if (!user || isClient) {
    return null;
  }

  return (
    <div className="position-relative" ref={containerRef}>
      <button
        type="button"
        className="btn btn-outline-light btn-sm position-relative"
        aria-label="Notificações"
        aria-expanded={open}
        onClick={handleToggle}
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span
            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
            data-testid="notification-badge"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="dropdown-menu dropdown-menu-end show" style={{ minWidth: "22rem" }}>
          <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom">
            <span className="fw-semibold">Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-link btn-sm p-0 text-decoration-none"
                disabled={markingAll}
                onClick={handleMarkAllAsRead}
              >
                {markingAll ? "A marcar..." : "Marcar todas como lidas"}
              </button>
            )}
          </div>

          <div className="dropdown-menu-body" data-testid="notification-list" style={{ maxHeight: "18rem", overflowY: "auto" }}>
            {loading && (
              <div className="text-center text-muted small py-3">A carregar...</div>
            )}

            {!loading && error && (
              <div className="text-center text-danger small py-3" role="alert">
                {error}
              </div>
            )}

            {!loading && !error && notifications.length === 0 && (
              <div className="text-center text-muted small py-3">
                Sem notificações.
              </div>
            )}

            {!loading &&
              !error &&
              notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className={`dropdown-item d-flex flex-column align-items-start gap-1 ${notification.readAt ? "" : "bg-warning-subtle"}`}
                  onClick={() => handleMarkAsRead(notification)}
                >
                  <span className={`small ${notification.readAt ? "" : "fw-semibold"}`}>
                    {notification.title}
                  </span>
                  <span className="small text-dark">{notification.message}</span>
                  <span className="small text-muted">
                    {formatCreatedAt(notification.createdAt)}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}