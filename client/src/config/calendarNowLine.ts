import { DateTime } from "luxon";

/**
 * Posição vertical (px) da linha "agora" na grelha horária, ou null se fora do intervalo visível.
 */
export function computeNowLineTopPx(
  timezone: string,
  startHour: number,
  endHour: number,
  hourHeight: number,
  at?: DateTime,
): number | null {
  const now = (at ?? DateTime.now()).setZone(timezone);
  const minutesFromMidnight = now.hour * 60 + now.minute + now.second / 60;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  if (minutesFromMidnight < startMinutes || minutesFromMidnight >= endMinutes) {
    return null;
  }
  const totalMinutes = endMinutes - startMinutes;
  const minutesFromStart = minutesFromMidnight - startMinutes;
  const gridHeight = (endHour - startHour) * hourHeight;
  return (minutesFromStart / totalMinutes) * gridHeight;
}
