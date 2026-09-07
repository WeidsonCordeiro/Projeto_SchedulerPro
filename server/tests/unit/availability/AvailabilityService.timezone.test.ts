import { beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityRepository, userRepository, companyRepository } = vi.hoisted(() => ({
  availabilityRepository: { findByEmployeeAndDay: vi.fn() },
  userRepository: { findById: vi.fn() },
  companyRepository: { findById: vi.fn() },
}));

vi.mock("../../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));

import AvailabilityService from "../../../src/modules/availability/services/AvailabilityService";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const employee = { companyId: { toString: () => companyId }, isActive: true, deletedAt: null, role: "EMPLOYEE" };
const availability = (extra = {}) => ({
  companyId: { toString: () => companyId }, employeeId: { toString: () => employeeId },
  morningStart: "09:00", morningEnd: "12:00", afternoonStart: "14:00", afternoonEnd: "18:00", dayOfWeek: 1,
  ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  userRepository.findById.mockResolvedValue(employee);
  companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
  availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability());
});

describe("AvailabilityService.ensureEmployeeAvailable por timezone", () => {
  it("consulta o dia local da empresa quando UTC atravessa meia-noite", async () => {
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability({ dayOfWeek: 1, morningStart: "00:00", morningEnd: "02:00" }));
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId,
      employeeId,
      new Date("2026-08-30T23:30:00.000Z"),
      new Date("2026-08-31T00:00:00.000Z"),
    )).resolves.toBeUndefined();
    expect(availabilityRepository.findByEmployeeAndDay).toHaveBeenCalledWith(companyId, employeeId, 1);
  });

  it.each([
    ["America/Sao_Paulo", "2026-08-30T12:00:00.000Z", "2026-08-30T12:30:00.000Z", 0, "09:00"],
    ["America/New_York", "2026-01-05T14:00:00.000Z", "2026-01-05T14:30:00.000Z", 1, "09:00"],
  ])("usa o timezone %s para obter dia/hora local", async (timezone, start, end, day, localStart) => {
    companyRepository.findById.mockResolvedValue({ timezone });
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability({ dayOfWeek: day, morningStart: localStart, morningEnd: "10:00" }));
    await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date(start), new Date(end))).resolves.toBeUndefined();
    expect(availabilityRepository.findByEmployeeAndDay).toHaveBeenCalledWith(companyId, employeeId, day);
  });

  it("interpreta a disponibilidade no horário local antes e depois da entrada no DST", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability({ dayOfWeek: 0, morningStart: "00:00", morningEnd: "04:00" }));
    await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-03-29T00:30:00.000Z"), new Date("2026-03-29T01:00:00.000Z"))).resolves.toBeUndefined();
    await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-03-29T01:30:00.000Z"), new Date("2026-03-29T02:00:00.000Z"))).resolves.toBeUndefined();
  });

  it("preserva a regra atual de rejeitar um intervalo que atravessa dias locais", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
    await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T22:30:00.000Z"), new Date("2026-08-30T23:30:00.000Z"))).rejects.toBeInstanceOf(AppError);
  });

  it("registra o comportamento atual para horário ambíguo na saída do DST", async () => {
    companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
    availabilityRepository.findByEmployeeAndDay.mockResolvedValue(availability({ dayOfWeek: 0, morningStart: "01:00", morningEnd: "02:00" }));
    await expect(AvailabilityService.ensureEmployeeAvailable(
      companyId,
      employeeId,
      new Date("2026-10-25T00:30:00.000Z"),
      new Date("2026-10-25T01:00:00.000Z"),
    )).resolves.toBeUndefined();
  });
});
