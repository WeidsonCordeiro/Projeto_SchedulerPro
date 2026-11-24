import { describe, expect, it } from "vitest";
import {
  APPOINTMENT_ACTION_LABELS,
  APPOINTMENT_ACTION_SUCCESS_MESSAGES,
  APPOINTMENT_STATUS_BADGE_CLASS,
  APPOINTMENT_STATUS_PROGRESS_BAR_CLASS,
  APPOINTMENT_STATUS_LABELS,
  getAppointmentStatusActions,
} from "./appointmentStatus";
import type { AppointmentStatus } from "../types/appointment";

const ALL_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no-show",
];

describe("appointmentStatus", () => {
  it("labels every backend status in Portuguese", () => {
    expect(APPOINTMENT_STATUS_LABELS).toEqual({
      scheduled: "Agendado",
      confirmed: "Confirmado",
      completed: "Concluído",
      cancelled: "Cancelado",
      "no-show": "Não compareceu",
    });
  });

  it("provides a badge class for every status", () => {
    ALL_STATUSES.forEach((status) => {
      expect(APPOINTMENT_STATUS_BADGE_CLASS[status]).toBeTruthy();
    });
  });

  it("provides a progress bar class for every status", () => {
    ALL_STATUSES.forEach((status) => {
      expect(APPOINTMENT_STATUS_PROGRESS_BAR_CLASS[status]).toMatch(/^bg-/);
    });
  });

  it("exposes labels for every status action", () => {
    expect(APPOINTMENT_ACTION_LABELS).toEqual({
      confirm: "Confirmar",
      complete: "Concluir",
      cancel: "Cancelar",
      "no-show": "Não compareceu",
    });
  });

  it("exposes success messages for every status action", () => {
    ["confirm", "complete", "cancel", "no-show"].forEach((action) => {
      expect(APPOINTMENT_ACTION_SUCCESS_MESSAGES[action as keyof typeof APPOINTMENT_ACTION_SUCCESS_MESSAGES]).toBeTruthy();
    });
  });

  it("allows confirm and cancel for scheduled appointments", () => {
    expect(getAppointmentStatusActions("scheduled")).toEqual([
      "confirm",
      "cancel",
    ]);
  });

  it("omits confirm for scheduled appointments whose startAt is in the past", () => {
    expect(
      getAppointmentStatusActions(
        "scheduled",
        "2026-09-10T11:00:00.000Z",
        "2026-09-10T12:00:00.000Z",
      ),
    ).toEqual(["cancel"]);
  });

  it("keeps confirm for scheduled appointments still in the future", () => {
    expect(
      getAppointmentStatusActions(
        "scheduled",
        "2026-09-10T13:00:00.000Z",
        "2026-09-10T12:00:00.000Z",
      ),
    ).toEqual(["confirm", "cancel"]);
  });

  it("keeps confirm for scheduled appointments when startAt equals now", () => {
    expect(
      getAppointmentStatusActions(
        "scheduled",
        "2026-09-10T12:00:00.000Z",
        "2026-09-10T12:00:00.000Z",
      ),
    ).toEqual(["confirm", "cancel"]);
  });

  it("allows complete, cancel and no-show for confirmed appointments", () => {
    expect(getAppointmentStatusActions("confirmed")).toEqual([
      "complete",
      "cancel",
      "no-show",
    ]);
  });

  it("allows no action once the appointment is finished", () => {
    expect(getAppointmentStatusActions("completed")).toEqual([]);
    expect(getAppointmentStatusActions("cancelled")).toEqual([]);
    expect(getAppointmentStatusActions("no-show")).toEqual([]);
  });
});