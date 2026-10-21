import { useEffect, useState } from "react";

/**
 * Subscreve a uma media query CSS. Alinhado ao breakpoint mobile do calendário (767.98px).
 */
export function useMatchMedia(query: string): boolean {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return undefined;
    }
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

export const MOBILE_CALENDAR_MEDIA_QUERY = "(max-width: 767.98px)";
