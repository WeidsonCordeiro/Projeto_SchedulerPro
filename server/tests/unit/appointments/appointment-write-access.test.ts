import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointmentRepository } = vi.hoisted(() => ({
  appointmentRepository: {
    findByIdInCompany: vi.fn(),
  },
}));

vi.mock(
  "../../../src/modules/appointments/repositories/AppointmentRepository",
  () => ({ default: appointmentRepository }),
);

import { Role } from "../../../src/constants/roles";
import { HttpMessages } from "../../../src/constants/http-messages";
import { HttpStatus } from "../../../src/constants/http-status";
import {
  assertEmployeePatchAllowed,
  loadAppointmentForStaffWrite,
  pickEmployeeUpdateDto,
} from "../../../src/modules/appointments/utils/appointment-write-access";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439013";
const appointmentId = "507f1f77bcf86cd799439021";

const employeeUser = {
  userId: employeeId,
  companyId,
  role: Role.EMPLOYEE,
};

const appointmentDoc = {
  _id: { toString: () => appointmentId },
  companyId: { toString: () => companyId },
  employeeId: { toString: () => employeeId },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("appointment-write-access", () => {
  describe("assertEmployeePatchAllowed", () => {
    it.each([
      ["clientId", { clientId: "507f1f77bcf86cd799439015" }],
      ["serviceId", { serviceId: "507f1f77bcf86cd799439017" }],
      ["employeeId", { employeeId: "507f1f77bcf86cd799439014" }],
    ])("rejeita %s com 400", (_field, payload) => {
      expect(() => assertEmployeePatchAllowed(payload)).toThrowError(
        HttpMessages.APPOINTMENT_UPDATE_FIELD_NOT_ALLOWED,
      );
    });

    it("permite notes e startAt", () => {
      expect(() =>
        assertEmployeePatchAllowed({
          notes: "ok",
          startAt: new Date("2027-08-29T08:00:00.000Z"),
        }),
      ).not.toThrow();
    });
  });

  describe("pickEmployeeUpdateDto", () => {
    it("devolve apenas notes e startAt", () => {
      expect(
        pickEmployeeUpdateDto({
          notes: "n",
          startAt: new Date("2027-08-29T08:00:00.000Z"),
          clientId: "x",
        } as never),
      ).toEqual({
        notes: "n",
        startAt: new Date("2027-08-29T08:00:00.000Z"),
      });
    });
  });

  describe("loadAppointmentForStaffWrite", () => {
    it("carrega com escopo de funcionário", async () => {
      appointmentRepository.findByIdInCompany.mockResolvedValue(appointmentDoc);

      const result = await loadAppointmentForStaffWrite(
        appointmentId,
        employeeUser,
      );

      expect(result).toBe(appointmentDoc);
      expect(appointmentRepository.findByIdInCompany).toHaveBeenCalledWith(
        appointmentId,
        companyId,
        { employeeId },
      );
    });

    it("lança 404 quando fora do escopo", async () => {
      appointmentRepository.findByIdInCompany.mockResolvedValue(null);

      await expect(
        loadAppointmentForStaffWrite(appointmentId, employeeUser),
      ).rejects.toMatchObject({
        message: HttpMessages.APPOINTMENT_NOT_FOUND,
        statusCode: HttpStatus.NOT_FOUND,
      });
    });
  });
});
