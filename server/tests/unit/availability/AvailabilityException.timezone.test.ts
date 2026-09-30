import { beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityRepository, companyRepository, availabilityExceptionRepository } = vi.hoisted(() => ({
  availabilityRepository: { findByEmployeeAndDay: vi.fn() },
  companyRepository: { findById: vi.fn() },
  availabilityExceptionRepository: { findByEmployeeAndDate: vi.fn() },
}));

vi.mock("../../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../../src/modules/availability/repositories/AvailabilityExceptionRepository", () => ({ default: availabilityExceptionRepository }));

import AvailabilityService from "../../../src/modules/availability/services/AvailabilityService";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const availability = (extra: Record<string, unknown> = {}) => ({
  companyId: { toString: () => companyId }, employeeId: { toString: () => employeeId },
  morningStart: "00:00", morningEnd: "04:00", afternoonStart: null, afternoonEnd: null, dayOfWeek: 0,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
  availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability());
  availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);
});

describe("AvailabilityService.ensureEmployeeAvailable com exceções por timezone/DST", () => {
  it("usa a data local da empresa no DST de primavera (Europe/Lisbon 2026-03-29)", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);

    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-03-29T00:30:00.000Z"), new Date("2026-03-29T01:00:00.000Z"),
    )).resolves.toBeUndefined();
    expect(availabilityExceptionRepository.findByEmployeeAndDate).toHaveBeenLastCalledWith(companyId, employeeId, "2026-03-29");

    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-03-29T01:30:00.000Z"), new Date("2026-03-29T02:00:00.000Z"),
    )).resolves.toBeUndefined();
    expect(availabilityExceptionRepository.findByEmployeeAndDate).toHaveBeenLastCalledWith(companyId, employeeId, "2026-03-29");
  });

  it("aplica exceção parcial em horário local correto no DST de primavera", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([{
      allDay: false, startTime: "02:00", endTime: "03:00",
    }]);

    // 00:30Z -> 01:30 local (WET): fora do bloqueio 02:00-03:00
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-03-29T00:30:00.000Z"), new Date("2026-03-29T01:00:00.000Z"),
    )).resolves.toBeUndefined();

    // 01:30Z -> 02:30 local (WEST): dentro do bloqueio 02:00-03:00
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-03-29T01:30:00.000Z"), new Date("2026-03-29T02:00:00.000Z"),
    )).rejects.toBeInstanceOf(AppError);
  });

  it("consulta a data local correta no DST de outono (Europe/Lisbon 2026-10-25)", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([{ allDay: true }]);

    // 03:00Z -> 03:00 local (WET)
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-10-25T03:00:00.000Z"), new Date("2026-10-25T03:30:00.000Z"),
    )).rejects.toBeInstanceOf(AppError);
    expect(availabilityExceptionRepository.findByEmployeeAndDate).toHaveBeenCalledWith(companyId, employeeId, "2026-10-25");
  });

  it("usa a data local da empresa (America/Sao_Paulo) para buscar exceções", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "America/Sao_Paulo" });
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability({
      morningStart: "09:00", morningEnd: "12:00", afternoonStart: null, afternoonEnd: null, dayOfWeek: 0,
    }));
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);

    // 12:00Z -> 09:00 local, mesma data
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-08-30T12:00:00.000Z"), new Date("2026-08-30T12:30:00.000Z"),
    )).resolves.toBeUndefined();
    expect(availabilityExceptionRepository.findByEmployeeAndDate).toHaveBeenCalledWith(companyId, employeeId, "2026-08-30");
  });

  it("usa o dia local anterior quando o UTC atravessa meia-noite (America/Sao_Paulo)", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "America/Sao_Paulo" });
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability({
      morningStart: "22:00", morningEnd: "23:59", afternoonStart: null, afternoonEnd: null, dayOfWeek: 6,
    }));
    availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);

    // 2026-08-30T02:00Z -> 2026-08-29 23:00 local
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId, employeeId,
      new Date("2026-08-30T02:00:00.000Z"), new Date("2026-08-30T02:30:00.000Z"),
    )).resolves.toBeUndefined();
    expect(availabilityExceptionRepository.findByEmployeeAndDate).toHaveBeenCalledWith(companyId, employeeId, "2026-08-29");
  });
});