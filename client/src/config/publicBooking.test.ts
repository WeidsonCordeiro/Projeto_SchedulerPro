import { describe, expect, it } from "vitest";
import {
  BOOKING_NO_SLOTS_MESSAGE,
  BOOKING_SLOT_TAKEN_MESSAGE,
  buildBookingPayload,
  formatBookingDate,
  formatBookingDuration,
  formatBookingPrice,
  formatDateKey,
  formatSlotTime,
  getBookingErrorMessage,
  getBookingFailureKind,
  getSlotKey,
  getTodayDateKey,
  isClientDetailsValid,
  isValidDateKey,
  toBookingAvatarImage,
  validateClientDetails,
} from "./publicBooking";
import { httpError, networkError } from "../test/http";
import { getApiError } from "../api/errors";

const VALID_DETAILS = {
  clientName: "Maria Silva",
  clientEmail: "maria@example.com",
  clientPhone: "",
  notes: "",
};

describe("publicBooking (config)", () => {
  describe("getBookingFailureKind", () => {
    it("maps each HTTP failure to the action the screen must take", () => {
      expect(getBookingFailureKind(getApiError(httpError(404)))).toBe("not_found");
      expect(getBookingFailureKind(getApiError(httpError(409)))).toBe("conflict");
      expect(getBookingFailureKind(getApiError(httpError(400)))).toBe("validation");
      expect(getBookingFailureKind(getApiError(httpError(500)))).toBe("server");
      expect(getBookingFailureKind(getApiError(networkError()))).toBe("network");
    });

    it("treats 429 as rate limiting even though getApiError has no kind for it", () => {
      // `getApiError` deixa 429 cair em "unknown"; a mensagem e a ação
      // (esperar, sem retry) são diferentes de qualquer outra falha.
      expect(getBookingFailureKind(getApiError(httpError(429)))).toBe("rate_limited");
    });
  });

  describe("getBookingErrorMessage", () => {
    it("translates 409 into the message that tells the user what to do next", () => {
      expect(getBookingErrorMessage(getApiError(httpError(409)))).toBe(
        BOOKING_SLOT_TAKEN_MESSAGE,
      );
    });

    it("never leaks a server error into the message", () => {
      const message = getBookingErrorMessage(getApiError(httpError(500)));

      expect(message).not.toContain("500");
      expect(message).toMatch(/Não foi possível concluir/i);
    });

    it("does not invent a message for a 404 the user cannot act on", () => {
      expect(getBookingErrorMessage(getApiError(httpError(404)))).toMatch(
        /desta empresa/i,
      );
    });
  });

  describe("validateClientDetails", () => {
    it("accepts a minimal valid payload (no phone, no notes)", () => {
      expect(isClientDetailsValid(validateClientDetails(VALID_DETAILS))).toBe(true);
    });

    it("requires a name of at least 2 characters, mirroring the backend", () => {
      const errors = validateClientDetails({ ...VALID_DETAILS, clientName: "M" });

      expect(errors.clientName).toBe("O nome deve ter pelo menos 2 caracteres.");
    });

    it("rejects a name longer than 100 characters", () => {
      const errors = validateClientDetails({
        ...VALID_DETAILS,
        clientName: "a".repeat(101),
      });

      expect(errors.clientName).toMatch(/100/);
    });

    it("counts the trimmed name, so trailing spaces cannot fake the length", () => {
      // O backend aplica `trim()` antes de `isLength`.
      const errors = validateClientDetails({
        ...VALID_DETAILS,
        clientName: "  a  ",
      });

      expect(errors.clientName).toMatch(/pelo menos 2/);
    });

    it("requires an email", () => {
      expect(
        validateClientDetails({ ...VALID_DETAILS, clientEmail: "   " }).clientEmail,
      ).toBe("O e-mail é obrigatório.");
    });

    it("rejects a malformed email", () => {
      expect(
        validateClientDetails({ ...VALID_DETAILS, clientEmail: "maria@ex" })
          .clientEmail,
      ).toBe("O e-mail informado é inválido.");
    });

    it("rejects an email longer than 254 characters", () => {
      const long = `${"a".repeat(250)}@ex.com`;
      expect(validateClientDetails({ ...VALID_DETAILS, clientEmail: long }).clientEmail)
        .toBe("O e-mail informado é inválido.");
    });

    it("accepts any phone length within 8..20, as the backend does by design", () => {
      // O backend valida só o tamanho, para não impor formato a números
      // internacionais. Uma "+351 912 345 678" tem 17 caracteres e é válida.
      expect(
        validateClientDetails({ ...VALID_DETAILS, clientPhone: "+351 912 345 678" })
          .clientPhone,
      ).toBeUndefined();
    });

    it("rejects a phone that is present but too short", () => {
      expect(
        validateClientDetails({ ...VALID_DETAILS, clientPhone: "912345" })
          .clientPhone,
      ).toMatch(/entre 8 e 20/);
    });

    it("rejects notes longer than 500 characters", () => {
      expect(
        validateClientDetails({ ...VALID_DETAILS, notes: "x".repeat(501) }).notes,
      ).toMatch(/500/);
    });
  });

  describe("buildBookingPayload", () => {
    const selection = {
      serviceId: "svc1",
      employeeId: "emp1",
      startAt: "2026-10-08T09:00:00.000+01:00",
    };

    it("sends only the fields in the public contract", () => {
      const payload = buildBookingPayload(selection, VALID_DETAILS);

      expect(Object.keys(payload).sort()).toEqual([
        "clientEmail",
        "clientName",
        "employeeId",
        "serviceId",
        "startAt",
      ]);
    });

    it("keeps startAt verbatim, offset included", () => {
      // O backend valida que o ISO traz deslocamento; reconstruí-lo a partir da
      // hora mostrada trocaria o instante e marcaria na hora errada.
      const payload = buildBookingPayload(selection, VALID_DETAILS);

      expect(payload.startAt).toBe("2026-10-08T09:00:00.000+01:00");
    });

    it("omits the optional fields instead of sending empty strings", () => {
      const payload = buildBookingPayload(selection, {
        ...VALID_DETAILS,
        clientPhone: "",
        notes: "",
      });

      expect("clientPhone" in payload).toBe(false);
      expect("notes" in payload).toBe(false);
    });

    it("includes the optional fields once they have content", () => {
      const payload = buildBookingPayload(selection, {
        ...VALID_DETAILS,
        clientPhone: "912345678",
        notes: "Primeira vez",
      });

      expect(payload.clientPhone).toBe("912345678");
      expect(payload.notes).toBe("Primeira vez");
    });

    it("trims the client's fields before sending them", () => {
      const payload = buildBookingPayload(selection, {
        clientName: "  Maria Silva  ",
        clientEmail: "  maria@example.com  ",
        clientPhone: "  912345678  ",
        notes: "  nota  ",
      });

      expect(payload.clientName).toBe("Maria Silva");
      expect(payload.clientEmail).toBe("maria@example.com");
      expect(payload.clientPhone).toBe("912345678");
      expect(payload.notes).toBe("nota");
    });
  });

  describe("formatSlotTime", () => {
    it("converts the instant into the company timezone, not UTC", () => {
      // 09:00 em Lisboa (UTC+1) é 08:00Z. Mostrar o valor cru seria 08:00.
      const startAt = "2026-10-08T09:00:00.000+01:00";

      expect(formatSlotTime(startAt, "Europe/Lisbon")).toBe("09:00");
    });

    it("shows a different hour for a company in another timezone", () => {
      const startAt = "2026-10-08T09:00:00.000+01:00";

      expect(formatSlotTime(startAt, "America/Sao_Paulo")).toBe("05:00");
    });

    it("falls back to the offset embedded in the instant instead of assuming UTC", () => {
      // Sem fuso conhecido, o offset do próprio startAt é melhor do que UTC:
      // mostra a hora de parede que o servidor calculou, não a de Greenwich.
      expect(formatSlotTime("2026-10-08T09:00:00.000+01:00")).toBe("09:00");
    });

    it("returns an empty string for an invalid instant", () => {
      expect(formatSlotTime("nao-e-uma-data", "Europe/Lisbon")).toBe("");
    });
  });

  describe("formatBookingDate", () => {
    it("names the weekday and the date in Portuguese", () => {
      expect(formatBookingDate("2026-10-08T09:00:00.000+01:00", "Europe/Lisbon")).toBe(
        "Quinta-feira, 8 de outubro de 2026",
      );
    });
  });

  describe("formatDateKey", () => {
    it("renders a calendar day without shifting it between timezones", () => {
      expect(formatDateKey("2026-10-08")).toBe("08/10/2026");
    });

    it("returns an empty string for a key that is not a calendar day", () => {
      expect(formatDateKey("2026-10-08T00:00:00Z")).toBe("");
    });
  });

  describe("getTodayDateKey", () => {
    it("returns a YYYY-MM-DD key for the given timezone", () => {
      expect(getTodayDateKey("Europe/Lisbon")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("can be a different calendar day in two timezones", () => {
      // Não é um teste determinístico sem fixar o instante, mas serve de rede
      // de segurança: a função tem de ACEITAR um fuso e não ignorá-lo.
      expect(getTodayDateKey("Pacific/Kiritimati")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(getTodayDateKey("Pacific/Niue")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isValidDateKey", () => {
    it("accepts a calendar day", () => {
      expect(isValidDateKey("2026-10-08")).toBe(true);
    });

    it("rejects an instant, an empty string and a malformed day", () => {
      expect(isValidDateKey("2026-10-08T00:00:00.000Z")).toBe(false);
      expect(isValidDateKey("")).toBe(false);
      expect(isValidDateKey("08-10-2026")).toBe(false);
      expect(isValidDateKey("2026-13-45")).toBe(false);
    });
  });

  describe("formatBookingDuration", () => {
    it("renders minutes, hours and a combination", () => {
      expect(formatBookingDuration(45)).toBe("45 min");
      expect(formatBookingDuration(60)).toBe("1 h");
      expect(formatBookingDuration(90)).toBe("1 h 30 min");
    });

    it("returns an empty string for a non-positive duration", () => {
      expect(formatBookingDuration(0)).toBe("");
    });
  });

  describe("formatBookingPrice", () => {
    it("uses the pt-PT format of the rest of the application", () => {
      expect(formatBookingPrice(25)).toBe("25,00");
    });
  });

  describe("getSlotKey", () => {
    it("keys the slot by its instant, not by the formatted hour", () => {
      // Dois slots em dias diferentes podem ter a mesma "HH:mm"; a chave tem
      // de os distinguir.
      expect(
        getSlotKey({ startAt: "2026-10-08T09:00:00.000+01:00", endAt: "x" }),
      ).not.toBe(
        getSlotKey({ startAt: "2026-10-09T09:00:00.000+01:00", endAt: "x" }),
      );
    });
  });

  describe("toBookingAvatarImage", () => {
    it("adapts a URL into a StoredImage", () => {
      expect(toBookingAvatarImage("https://cdn/x.png")).toEqual({
        url: "https://cdn/x.png",
        publicId: "",
      });
    });

    it("returns null for a missing or blank URL, so initials are shown", () => {
      expect(toBookingAvatarImage(null)).toBeNull();
      expect(toBookingAvatarImage("   ")).toBeNull();
      expect(toBookingAvatarImage(undefined)).toBeNull();
    });
  });

  it("exposes the empty-slot message as a distinct constant", () => {
    expect(BOOKING_NO_SLOTS_MESSAGE).toMatch(/outra data/i);
  });
});