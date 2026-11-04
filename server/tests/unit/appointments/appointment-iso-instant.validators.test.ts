import { validationResult } from "express-validator";
import { describe, expect, it } from "vitest";
import { Request } from "express";

import { createAppointmentValidator } from "../../../src/modules/appointments/validators/create-appointment.validator";
import { updateAppointmentValidator } from "../../../src/modules/appointments/validators/update-appointment.validator";

const ids = {
  client: "507f1f77bcf86cd799439011",
  service: "507f1f77bcf86cd799439012",
  employee: "507f1f77bcf86cd799439013",
};

const validCreateBody = {
  clientId: ids.client,
  serviceId: ids.service,
  employeeId: ids.employee,
  startAt: "2027-08-29T08:00:00.000Z",
};

async function validateCreate(body: Record<string, unknown>) {
  const req = { body } as Request;
  await Promise.all(
    createAppointmentValidator.map((validator) => validator.run(req)),
  );
  return validationResult(req).array();
}

async function validateUpdate(body: Record<string, unknown>) {
  const req = { body } as Request;
  await Promise.all(
    updateAppointmentValidator.map((validator) => validator.run(req)),
  );
  return validationResult(req).array();
}

describe("createAppointmentValidator startAt (iso instant)", () => {
  it("aceita payload válido com Z", async () => {
    expect(await validateCreate(validCreateBody)).toHaveLength(0);
  });

  it.each([
    "2027-08-29T08:00:00+01:00",
    "2027-08-29T08:00:00-03:00",
  ])("aceita offset explícito %s", async (startAt) => {
    expect(await validateCreate({ ...validCreateBody, startAt })).toHaveLength(
      0,
    );
  });

  it.each([
    ["sem offset", "2027-08-29T08:00:00"],
    ["data impossível", "2026-02-30"],
    ["data impossível com Z", "2026-02-30T09:00:00Z"],
    ["inválido", "not-a-date"],
  ])("rejeita startAt %s", async (_label, startAt) => {
    expect(
      await validateCreate({ ...validCreateBody, startAt }),
    ).not.toHaveLength(0);
  });
});

describe("updateAppointmentValidator startAt (iso instant)", () => {
  it("aceita PATCH só com notes", async () => {
    expect(await validateUpdate({ notes: "ok" })).toHaveLength(0);
  });

  it("rejeita startAt sem offset", async () => {
    expect(
      await validateUpdate({ startAt: "2027-08-29T08:00:00" }),
    ).not.toHaveLength(0);
  });

  it("aceita startAt com Z", async () => {
    expect(
      await validateUpdate({ startAt: "2027-08-29T09:00:00.000Z" }),
    ).toHaveLength(0);
  });
});
