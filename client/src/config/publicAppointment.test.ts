import { describe, expect, it } from "vitest";
import { getApiError } from "../api/errors";
import type { ApiFailure } from "../api/errors";
import { httpError, networkError } from "../test/http";
import type { PublicAppointment } from "../types/publicAppointment";
import {
  getPublicAppointmentLoadFailure,
  getPublicAppointmentPeriod,
  getPublicAppointmentWriteMessage,
  isPublicAppointmentEditable,
  isPublicAppointmentNotEditableFailure,
  PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE,
  PUBLIC_APPOINTMENT_RATE_LIMIT_MESSAGE,
  toPublicAvatarImage,
} from "./publicAppointment";

const futureStartAt = "2099-10-10T14:30:00.000Z";
const pastStartAt = "2000-10-10T14:30:00.000Z";

function makeAppointment(
  overrides: Partial<PublicAppointment> = {},
): PublicAppointment {
  return {
    id: "apt1",
    startAt: futureStartAt,
    endAt: "2099-10-10T15:00:00.000Z",
    timezone: "Europe/Lisbon",
    status: "scheduled",
    clientName: "Maria Silva",
    service: { id: "svc1", name: "Corte de cabelo" },
    employee: { id: "emp1", name: "João Silva", avatarUrl: null },
    ...overrides,
  };
}

describe("getPublicAppointmentLoadFailure", () => {
  it("maps 404 to not_found", () => {
    expect(getPublicAppointmentLoadFailure(getApiError(httpError(404)))).toBe(
      "not_found",
    );
  });

  it("maps 429 to rate_limited", () => {
    expect(getPublicAppointmentLoadFailure(getApiError(httpError(429)))).toBe(
      "rate_limited",
    );
  });

  it.each([
    ["server", httpError(500)],
    ["network", networkError()],
  ])("maps %s to error", (_label, error) => {
    expect(getPublicAppointmentLoadFailure(getApiError(error))).toBe("error");
  });
});

describe("getPublicAppointmentWriteMessage", () => {
  it("keeps the business rule message returned by the backend on 400", () => {
    const failure = getApiError(
      httpError(400, { message: "Este horário já não está disponível." }),
    );

    expect(getPublicAppointmentWriteMessage(failure)).toBe(
      "Este horário já não está disponível.",
    );
  });

  it("replaces the 429 message with the public one", () => {
    expect(getPublicAppointmentWriteMessage(getApiError(httpError(429)))).toBe(
      PUBLIC_APPOINTMENT_RATE_LIMIT_MESSAGE,
    );
  });

  it("normalises 404 on a write", () => {
    expect(
      getPublicAppointmentWriteMessage(
        getApiError(httpError(404, { message: "anything" })),
      ),
    ).toBe("Agendamento não encontrado.");
  });

  it("falls back to the shared friendly message when the backend is silent", () => {
    const failure: ApiFailure = { kind: "validation", status: 400, message: "" };

    expect(getPublicAppointmentWriteMessage(failure)).toBe(
      "Dados inválidos. Verifique as informações e tente novamente.",
    );
  });
});

describe("isPublicAppointmentNotEditableFailure", () => {
  it("recognises the single not-editable message returned with 400", () => {
    const failure = getApiError(
      httpError(400, { message: PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE }),
    );

    expect(isPublicAppointmentNotEditableFailure(failure)).toBe(true);
  });

  it("does not recognise other business rule failures", () => {
    const failure = getApiError(
      httpError(400, { message: "Este horário já não está disponível." }),
    );

    expect(isPublicAppointmentNotEditableFailure(failure)).toBe(false);
  });

  it("is false for non-validation failures", () => {
    expect(
      isPublicAppointmentNotEditableFailure({
        kind: "server",
        status: 500,
        message: PUBLIC_APPOINTMENT_NOT_EDITABLE_MESSAGE,
      }),
    ).toBe(false);
  });
});

describe("isPublicAppointmentEditable", () => {
  it.each(["scheduled", "confirmed"] as const)(
    "allows %s appointments still in the future",
    (status) => {
      expect(isPublicAppointmentEditable(makeAppointment({ status }))).toBe(true);
    },
  );

  it.each(["completed", "cancelled", "no-show"] as const)(
    "blocks %s appointments",
    (status) => {
      expect(isPublicAppointmentEditable(makeAppointment({ status }))).toBe(
        false,
      );
    },
  );

  it("blocks appointments that already started", () => {
    expect(
      isPublicAppointmentEditable(makeAppointment({ startAt: pastStartAt })),
    ).toBe(false);
  });

  it("blocks appointments with an unparseable start date", () => {
    expect(
      isPublicAppointmentEditable(makeAppointment({ startAt: "not-a-date" })),
    ).toBe(false);
  });

  it("compares against an explicit clock when provided", () => {
    const appointment = makeAppointment({ startAt: futureStartAt });

    expect(
      isPublicAppointmentEditable(
        appointment,
        new Date(futureStartAt).getTime() + 1000,
      ),
    ).toBe(false);
  });
});

describe("getPublicAppointmentPeriod", () => {
  it("formats the start and end times in the company timezone", () => {
    expect(
      getPublicAppointmentPeriod(
        makeAppointment({
          startAt: "2026-10-10T14:30:00.000Z",
          endAt: "2026-10-10T15:00:00.000Z",
        }),
      ),
    ).toBe("15:30 – 16:00");
  });

  it("returns only the known side when one of them is invalid", () => {
    expect(
      getPublicAppointmentPeriod(
        makeAppointment({
          startAt: "not-a-date",
          endAt: "2026-10-10T15:00:00.000Z",
        }),
      ),
    ).toBe("16:00");
  });

  it("returns an empty string when both dates are invalid", () => {
    expect(
      getPublicAppointmentPeriod(
        makeAppointment({ startAt: "not-a-date", endAt: "also-not" }),
      ),
    ).toBe("");
  });
});

describe("toPublicAvatarImage", () => {
  it("adapts a URL to the ImageAvatar input", () => {
    expect(toPublicAvatarImage("https://cdn.example/avatar.jpg")).toEqual({
      url: "https://cdn.example/avatar.jpg",
      publicId: "",
    });
  });

  it.each([null, undefined, "", "   "])(
    "returns null for %s so the avatar falls back to initials",
    (value) => {
      expect(toPublicAvatarImage(value)).toBeNull();
    },
  );
});
