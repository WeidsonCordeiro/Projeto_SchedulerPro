import { useEffect, useState } from "react";

export const TIME_GRID_DESKTOP_MEDIA_QUERY = "(min-width: 992px)";
export const TIME_GRID_HOUR_HEIGHT_MOBILE_PX = 48;
export const TIME_GRID_HOUR_HEIGHT_DESKTOP_PX = 60;

export function resolveTimeGridHourHeightPx(matchesDesktop: boolean): number {
  return matchesDesktop
    ? TIME_GRID_HOUR_HEIGHT_DESKTOP_PX
    : TIME_GRID_HOUR_HEIGHT_MOBILE_PX;
}

function readDesktopMediaMatch(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(TIME_GRID_DESKTOP_MEDIA_QUERY).matches;
}

/** Altura de cada linha horária na grelha Semana/Dia (48 mobile, 60 desktop). */
export function useTimeGridHourHeightPx(): number {
  const [hourHeight, setHourHeight] = useState(() =>
    resolveTimeGridHourHeightPx(readDesktopMediaMatch()),
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia(TIME_GRID_DESKTOP_MEDIA_QUERY);
    const sync = () => {
      setHourHeight(resolveTimeGridHourHeightPx(media.matches));
    };
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return hourHeight;
}
