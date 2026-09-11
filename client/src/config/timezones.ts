/**
 * Lista completa de timezones IANA para a configuração da empresa.
 *
 * A fonte preferida é Intl.supportedValuesOf("timeZone"), que devolve todos
 * os fuso horários IANA suportados pelo runtime (418 em Node moderno). Isso
 * evita uma lista improvisada/pequena e mantém o valor real devolvido pelo
 * backend selecionável no formulário.
 *
 * SeIntl.supportedValuesOf não estiver disponível, usa uma lista de fallback
 * com os principais fusos IANA do mundo.
 */

import { IANAZone } from "luxon";

const FALLBACK_TIMEZONES = [
  "Africa/Abidjan",
  "Africa/Cairo",
  "Africa/Casablanca",
  "Africa/Johannesburg",
  "Africa/Lagos",
  "Africa/Nairobi",
  "America/Argentina/Buenos_Aires",
  "America/Bogota",
  "America/Caracas",
  "America/Chicago",
  "America/Denver",
  "America/Halifax",
  "America/Lima",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Panama",
  "America/Phoenix",
  "America/Santiago",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Ashgabat",
  "Asia/Baghdad",
  "Asia/Bangkok",
  "Asia/Beirut",
  "Asia/Dhaka",
  "Asia/Dubai",
  "Asia/Ho_Chi_Minh",
  "Asia/Hong_Kong",
  "Asia/Istanbul",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Karachi",
  "Asia/Kathmandu",
  "Asia/Kolkata",
  "Asia/Kuala_Lumpur",
  "Asia/Manila",
  "Asia/Riyadh",
  "Asia/Seoul",
  "Asia/Shanghai",
  "Asia/Singapore",
  "Asia/Taipei",
  "Asia/Tehran",
  "Asia/Tokyo",
  "Asia/Tomsk",
  "Asia/Ulaanbaatar",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Darwin",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Athens",
  "Europe/Berlin",
  "Europe/Brussels",
  "Europe/Bucharest",
  "Europe/Dublin",
  "Europe/Helsinki",
  "Europe/Lisbon",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Moscow",
  "Europe/Oslo",
  "Europe/Paris",
  "Europe/Prague",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Vienna",
  "Europe/Warsaw",
  "Europe/Zurich",
  "Pacific/Auckland",
  "Pacific/Chatham",
  "Pacific/Fiji",
  "Pacific/Honolulu",
  "Pacific/Kiritimati",
  "Pacific/Tongatapu",
];

function sortZones(zones: string[]): string[] {
  return [...zones].sort((a, b) => a.localeCompare(b, "en"));
}

export function getIanaTimezones(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    try {
      const zones = Intl.supportedValuesOf("timeZone");
      if (Array.isArray(zones) && zones.length > 0) {
        return sortZones(zones);
      }
    } catch {
      // segue para o fallback
    }
  }

  return sortZones(FALLBACK_TIMEZONES);
}

/**
 * Valida um valor como timezone IANA com a mesma semântica do backend
 * (server/src/utils/timezone.ts usa IANAZone.isValidZone da Luxon). Aceita
 * aliases canônicos como "UTC", que não aparecem na lista do
 * Intl.supportedValuesOf. Pressupõe valor já sem espaços extras.
 */
export function isValidIanaTimezone(value: string): boolean {
  return typeof value === "string" && IANAZone.isValidZone(value);
}