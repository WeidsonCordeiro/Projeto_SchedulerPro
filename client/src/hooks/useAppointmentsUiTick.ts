import { useEffect, useState } from "react";
import { DateTime } from "luxon";

/** Intervalo para reavaliar ações temporais na página de agendamentos (sem refetch da API). */
export const APPOINTMENTS_UI_TICK_INTERVAL_MS = 30_000;

function currentUtcIso(): string {
  return DateTime.now().toUTC().toISO() ?? "";
}

/**
 * Dispara um re-render periódico com o instante actual (UTC ISO) para que
 * getAppointmentStatusActions e regras de confirmação reavaliem o relógio.
 */
export function useAppointmentsUiTick(enabled: boolean): string {
  const [uiNowISO, setUiNowISO] = useState(currentUtcIso);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    setUiNowISO(currentUtcIso());
    const intervalId = window.setInterval(() => {
      setUiNowISO(currentUtcIso());
    }, APPOINTMENTS_UI_TICK_INTERVAL_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabled]);

  return uiNowISO;
}