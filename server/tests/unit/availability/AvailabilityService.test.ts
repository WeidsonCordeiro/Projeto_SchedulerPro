import { beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityRepository, userRepository, companyRepository, availabilityExceptionRepository } = vi.hoisted(() => ({ availabilityRepository: {
  findById: vi.fn(), findByCompanyId: vi.fn(), findByEmployeeId: vi.fn(),
  findByEmployeeAndDay: vi.fn(), create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
}, userRepository: { findById: vi.fn() }, companyRepository: { findById: vi.fn() }, availabilityExceptionRepository: {
  findByEmployeeAndDate: vi.fn(),
} }));

vi.mock("../../../src/modules/availability/repositories/AvailabilityRepository", () => ({ default: availabilityRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({ default: companyRepository }));
vi.mock("../../../src/modules/availability/repositories/AvailabilityExceptionRepository", () => ({ default: availabilityExceptionRepository }));

import AvailabilityService from "../../../src/modules/availability/services/AvailabilityService";
import { AppError } from "../../../src/errors/AppError";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const employee = { companyId: { toString: () => companyId }, isActive: true, deletedAt: null, role: "EMPLOYEE" };
const doc = (extra = {}) => ({ _id: { toString: () => "507f1f77bcf86cd799439013" }, companyId: { toString: () => companyId }, employeeId: { toString: () => employeeId }, dayOfWeek: 0, morningStart: "09:00", morningEnd: "12:00", afternoonStart: "14:00", afternoonEnd: "18:00", createdAt: new Date(), updatedAt: new Date(), ...extra });

beforeEach(() => { vi.clearAllMocks(); userRepository.findById.mockResolvedValue(employee); companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" }); availabilityRepository.findByEmployeeAndDay.mockResolvedValue(null); availabilityRepository.create.mockResolvedValue(doc()); availabilityRepository.update.mockResolvedValue(doc()); availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]); });

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

  describe("ensureEmployeeAvailable com exceções de disponibilidade", () => {
    const exceptionDoc = (extra: Record<string, unknown> = {}) => ({ allDay: false, startTime: "10:00", endTime: "11:00", ...extra });
    const slot = () => [new Date("2026-08-30T08:30:00Z"), new Date("2026-08-30T09:00:00Z")] as const; // local 09:30-10:00

    beforeEach(() => {
      availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc({ morningStart: "09:00", morningEnd: "12:00", afternoonStart: null, afternoonEnd: null }));
    });

    it("rejeita exceção de dia inteiro na data do agendamento", async () => {
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionDoc({ allDay: true })]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, ...slot())).rejects.toMatchObject({ statusCode: 409 });
    });

    it.each([
      ["bloqueio 09:00-09:40 (início do slot)", "09:00", "09:40"],
      ["bloqueio 09:40-09:50 (meio do slot)", "09:40", "09:50"],
      ["bloqueio 09:50-10:30 (fim do slot)", "09:50", "10:30"],
      ["bloqueio maior que o slot", "08:00", "11:00"],
    ])("rejeita slot quando há sobreposição: %s", async (_, start, end) => {
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionDoc({ startTime: start, endTime: end })]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, ...slot())).rejects.toMatchObject({ statusCode: 409 });
    });

    it("permite slot que termina exatamente no início da exceção", async () => {
      availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc({ morningStart: "08:00", morningEnd: "12:00", afternoonStart: null, afternoonEnd: null }));
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionDoc({ startTime: "09:00", endTime: "09:30" })]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T07:30:00Z"), new Date("2026-08-30T08:00:00Z"))).resolves.toBeUndefined(); // local 08:30-09:00
    });

    it("permite slot que inicia exatamente no fim da exceção", async () => {
      availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc({ morningStart: "09:00", morningEnd: "12:00", afternoonStart: null, afternoonEnd: null }));
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionDoc({ startTime: "10:00", endTime: "11:00" })]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T10:00:00Z"), new Date("2026-08-30T10:30:00Z"))).resolves.toBeUndefined(); // local 11:00-11:30
    });

    it("rejeita slot de 60min iniciado antes do bloqueio que termina dentro dele (bloqueio 10:00-11:00, slot 09:30-10:30)", async () => {
      availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc({ morningStart: "09:00", morningEnd: "12:00", afternoonStart: null, afternoonEnd: null }));
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionDoc({ startTime: "10:00", endTime: "11:00" })]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T08:30:00Z"), new Date("2026-08-30T09:30:00Z"))).rejects.toMatchObject({ statusCode: 409 });
    });

    it("consulta exceções usando a data local da empresa", async () => {
      companyRepository.findById.mockResolvedValue({ timezone: "Europe/Lisbon" });
      availabilityRepository.findByEmployeeAndDay.mockResolvedValue(doc({ morningStart: "00:00", morningEnd: "02:00", afternoonStart: null, afternoonEnd: null }));
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, new Date("2026-08-30T23:30:00Z"), new Date("2026-08-31T00:00:00Z"))).resolves.toBeUndefined();
      expect(availabilityExceptionRepository.findByEmployeeAndDate).toHaveBeenCalledWith(companyId, employeeId, "2026-08-31");
    });

    it("prioriza a exceção mesmo quando a disponibilidade semanal existe", async () => {
      availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([exceptionDoc({ allDay: true })]);
      await expect(AvailabilityService.ensureEmployeeAvailable(companyId, employeeId, ...slot())).rejects.toMatchObject({ statusCode: 409 });
      expect(availabilityRepository.findByEmployeeAndDay).not.toHaveBeenCalled();
    });
  });
});
