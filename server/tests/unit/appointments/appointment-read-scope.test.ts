import { describe, expect, it } from "vitest";

import { Role } from "../../../src/constants/roles";
import {
  isCompanyWideAppointmentReadScope,
  resolveAppointmentReadScope,
  toAppointmentListScope,
} from "../../../src/modules/appointments/utils/appointment-read-scope";

const companyId = "507f1f77bcf86cd799439011";
const userId = "507f1f77bcf86cd799439013";
const clientId = "507f1f77bcf86cd799439015";

describe("resolveAppointmentReadScope", () => {
  it("OWNER devolve apenas companyId", () => {
    expect(
      resolveAppointmentReadScope({
        companyId,
        userId,
        role: Role.OWNER,
      }),
    ).toEqual({ companyId });
  });

  it("ADMIN e MANAGER devolvem apenas companyId", () => {
    for (const role of [Role.ADMIN, Role.MANAGER] as const) {
      expect(
        resolveAppointmentReadScope({ companyId, userId, role }),
      ).toEqual({ companyId });
    }
  });

  it("EMPLOYEE fixa employeeId ao userId da sessão", () => {
    expect(
      resolveAppointmentReadScope({
        companyId,
        userId,
        role: Role.EMPLOYEE,
      }),
    ).toEqual({ companyId, employeeId: userId });
  });

  it("CLIENT inclui clientId quando presente", () => {
    expect(
      resolveAppointmentReadScope({
        companyId,
        userId,
        role: Role.CLIENT,
        clientId,
      }),
    ).toEqual({ companyId, clientId });
  });

  it("CLIENT sem clientId devolve só companyId", () => {
    expect(
      resolveAppointmentReadScope({
        companyId,
        userId,
        role: Role.CLIENT,
      }),
    ).toEqual({ companyId });
  });
});

describe("isCompanyWideAppointmentReadScope", () => {
  it("empresa inteira quando não há clientId nem employeeId", () => {
    expect(isCompanyWideAppointmentReadScope({ companyId })).toBe(true);
  });

  it("não é empresa inteira com employeeId", () => {
    expect(
      isCompanyWideAppointmentReadScope({ companyId, employeeId: userId }),
    ).toBe(false);
  });

  it("não é empresa inteira com clientId", () => {
    expect(
      isCompanyWideAppointmentReadScope({ companyId, clientId }),
    ).toBe(false);
  });
});

describe("toAppointmentListScope", () => {
  it("mapeia employeeId e clientId para o repositório", () => {
    expect(
      toAppointmentListScope({ companyId, employeeId: userId }),
    ).toEqual({ employeeId: userId });
    expect(
      toAppointmentListScope({ companyId, clientId }),
    ).toEqual({ clientId });
    expect(toAppointmentListScope({ companyId })).toBeUndefined();
  });
});
