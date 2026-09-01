import { beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityRepository, userRepository, companyRepository } = vi.hoisted(() => ({ availabilityRepository: {
  findById: vi.fn(), findByCompanyId: vi.fn(), findByEmployeeId: vi.fn(),
  findByEmployeeAndDay: vi.fn(), create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
}, userRepository: { findById: vi.fn() }, companyRepository: { findById: vi.fn() } }));

vi.mock("../../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));

import AvailabilityService from "../../../src/modules/availability/services/AvailabilityService";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const employee = { companyId: { toString: () => companyId }, isActive: true, deletedAt: null, role: "EMPLOYEE" };
const doc = (extra = {}) => ({ _id: { toString: () => "507f1f77bcf86cd799439013" }, companyId: { toString: () => companyId }, employeeId: { toString: () => employeeId }, dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00", afternoonStart: "14:00", afternoonEnd: "18:00", createdAt: new Date(), updatedAt: new Date(), ...extra });

beforeEach(() => { vi.clearAllMocks(); userRepository.findById.mockResolvedValue(employee); companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" }); availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null); availabilityRepository.create.mockResolvedValue(doc()); availabilityRepository.update.mockResolvedValue(doc()); });

describe("AvailabilityService", () => {
  it("cria disponibilidade válida", async () => { const result = await AvailabilityService.create({ employeeId, dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00" }, companyId); expect(result.employeeId).toBe(employeeId); expect(availabilityRepository.create).toHaveBeenCalled(); });
  it.each([
    ["funcionário inexistente", null],
    ["funcionário inativo", { ...employee, isActive: false }],
    ["funcionário de outra empresa", { ...employee, companyId: { toString: () => "507f1f77bcf86cd799439099" } }],
  ])("rejeita %s", async (_, value) => { userRepository.findById.mockResolvedValue(value); await expect(AvailabilityService.create({ employeeId, dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00" }, companyId)).rejects.toBeInstanceOf(AppError); });
  it("rejeita ausência de período", async () => { await expect(AvailabilityService.create({ employeeId, dayOfWeek: 0 }, companyId)).rejects.toBeInstanceOf(AppError); });
  it("rejeita período incompleto", async () => { await expect(AvailabilityService.create({ employeeId, dayOfWeek: 0, morningStart: "09:00" }, companyId)).rejects.toBeInstanceOf(AppError); });
  it.each([["18:00", "09:00"], ["09:00", "09:00"]])("rejeita horário %s-%s", async (start, end) => { await expect(AvailabilityService.create({ employeeId, dayOfWeek: 0, morningStart: start, morningEnd: end }, companyId)).rejects.toBeInstanceOf(AppError); });
  it("rejeita sobreposição entre manhã e tarde", async () => { await expect(AvailabilityService.create({ employeeId, dayOfWeek: 0, morningStart: "09:00", morningEnd: "14:00", afternoonStart: "13:00", afternoonEnd: "18:00" }, companyId)).rejects.toBeInstanceOf(AppError); });
  it("rejeita disponibilidade duplicada", async () => { availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc()); await expect(AvailabilityService.create({ employeeId, dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00" }, companyId)).rejects.toBeInstanceOf(AppError); });
  it("atualiza e remove por soft delete", async () => { availabilityRepository.findById.mockResolvedValue(doc()); expect(await AvailabilityService.update("507f1f77bcf86cd799439013", { morningEnd: "11:00" }, companyId)).toBeTruthy(); await AvailabilityService.delete("507f1f77bcf86cd799439013", companyId); expect(availabilityRepository.softDelete).toHaveBeenCalled(); });
  it("converte UTC para o timezone da empresa", async () => { const start = new Date("2026-08-30T16:30:00.000Z"); const end = new Date("2026-08-30T17:00:00.000Z"); availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc()); await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, start, end)).resolves.toBeUndefined(); expect(availabilityRepository.findByEmployeeAndDay).toHaveBeenCalledWith(companyId, employeeId, 0); });
  it("rejeita período indisponível e virada de dia", async () => { availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc()); await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T07:00:00Z"), new Date("2026-08-30T07:30:00Z"))).rejects.toBeInstanceOf(AppError); await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T22:30:00Z"), new Date("2026-08-30T23:30:00Z"))).rejects.toBeInstanceOf(AppError); });
});
