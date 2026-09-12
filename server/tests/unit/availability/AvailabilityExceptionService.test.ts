import { beforeEach, describe, expect, it, vi } from "vitest";

const { availabilityExceptionRepository, userRepository } = vi.hoisted(() => ({
  availabilityExceptionRepository: {
    findById: vi.fn(), findByCompanyId: vi.fn(), findByEmployeeId: vi.fn(),
    findByEmployeeAndDate: vi.fn(), create: vi.fn(), update: vi.fn(), softDelete: vi.fn(),
  },
  userRepository: { findById: vi.fn() },
}));

vi.mock("../../../src/modules/availability/repositories/AvailabilityExceptionRepository", () => ({ default: availabilityExceptionRepository }));
vi.mock("../../../src/modules/users/repositories/UserRepository", () => ({ default: userRepository }));

import AvailabilityExceptionService from "../../../src/modules/availability/services/AvailabilityExceptionService";
import { AppError } from "../../../src/errors/AppError";
import { HttpStatus } from "../../../src/constants/http-status";

const companyId = "507f1f77bcf86cd799439011";
const employeeId = "507f1f77bcf86cd799439012";
const id = "507f1f77bcf86cd799439013";
const ref = (value: string) => ({ toString: () => value });

const employee = { companyId: ref(companyId), isActive: true, deletedAt: null, role: "EMPLOYEE" };

const doc = (extra: Record<string, unknown> = {}) => ({
  _id: ref(id), companyId: ref(companyId), employeeId: ref(employeeId),
  date: "2026-08-30", allDay: false, startTime: "10:00", endTime: "11:00",
  type: "BLOCK", reason: null, createdAt: new Date(), updatedAt: new Date(), ...extra,
});

beforeEach(() => {
  vi.clearAllMocks();
  userRepository.findById.mockResolvedValue(employee);
  availabilityExceptionRepository.findById.mockResolvedValue(doc());
  availabilityExceptionRepository.findByCompanyId.mockResolvedValue([doc()]);
  availabilityExceptionRepository.findByEmployeeId.mockResolvedValue([doc()]);
  availabilityExceptionRepository.findByEmployeeAndDate.mockResolvedValue([doc()]);
  availabilityExceptionRepository.create.mockResolvedValue(doc());
  availabilityExceptionRepository.update.mockResolvedValue(doc());
});

describe("AvailabilityExceptionService.create", () => {
  const partial = { employeeId, date: "2026-08-30", startTime: "10:00", endTime: "11:00", type: "BLOCK", reason: "Reunião" };

  it("cria exceção de período válida", async () => {
    const result = await AvailabilityExceptionService.create(partial, companyId);
    expect(result.startTime).toBe("10:00");
    expect(result.allDay).toBe(false);
    expect(availabilityExceptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ employeeId: expect.anything(), date: "2026-08-30", startTime: "10:00", endTime: "11:00" }),
    );
  });

  it("cria exceção de dia inteiro e limpa horários", async () => {
    await AvailabilityExceptionService.create({ ...partial, allDay: true, startTime: "10:00", endTime: "11:00" }, companyId);
    expect(availabilityExceptionRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ allDay: true, startTime: null, endTime: null }),
    );
  });

  it.each([
    ["funcionário inexistente", null],
    ["funcionário inativo", { ...employee, isActive: false }],
    ["funcionário de outra empresa", { ...employee, companyId: ref("507f1f77bcf86cd799439099") }],
    ["funcionário cliente", { ...employee, role: "CLIENT" }],
  ])("rejeita %s", async (_, value) => {
    userRepository.findById.mockResolvedValue(value);
    await expect(AvailabilityExceptionService.create(partial, companyId)).rejects.toBeInstanceOf(AppError);
    expect(availabilityExceptionRepository.create).not.toHaveBeenCalled();
  });

  it.each([
    ["data inexistente", "2026-02-31"],
    ["data mal formatada", "30-08-2026"],
    ["mês inválido", "2026-13-01"],
  ])("rejeita %s", async (_, date) => {
    await expect(AvailabilityExceptionService.create({ ...partial, date }, companyId)).rejects.toBeInstanceOf(AppError);
  });

  it("rejeita período sem horários", async () => {
    await expect(AvailabilityExceptionService.create({ employeeId, date: "2026-08-30", allDay: false }, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
  });

  it("rejeita início igual ou posterior ao fim", async () => {
    await expect(AvailabilityExceptionService.create({ ...partial, startTime: "11:00", endTime: "11:00" }, companyId)).rejects.toBeInstanceOf(AppError);
    await expect(AvailabilityExceptionService.create({ ...partial, startTime: "12:00", endTime: "11:00" }, companyId)).rejects.toBeInstanceOf(AppError);
  });

  it("rejeita horário fora do formato HH:mm", async () => {
    await expect(AvailabilityExceptionService.create({ ...partial, startTime: "25:00" }, companyId)).rejects.toBeInstanceOf(AppError);
  });

  it("rejeita tipo inválido", async () => {
    await expect(AvailabilityExceptionService.create({ ...partial, type: "X" as never }, companyId)).rejects.toBeInstanceOf(AppError);
  });
});

describe("AvailabilityExceptionService.findAll/findById", () => {
  it("lista todas as exceções sem filtro de funcionário", async () => {
    const result = await AvailabilityExceptionService.findAll(companyId);
    expect(result).toHaveLength(1);
    expect(availabilityExceptionRepository.findByCompanyId).toHaveBeenCalledWith(companyId);
  });

  it("filtra por funcionário após validá-lo", async () => {
    const result = await AvailabilityExceptionService.findAll(companyId, employeeId);
    expect(result).toHaveLength(1);
    expect(availabilityExceptionRepository.findByEmployeeId).toHaveBeenCalledWith(companyId, employeeId);
  });

  it("rejeita filtro de funcionário inexistente", async () => {
    userRepository.findById.mockResolvedValue(null);
    await expect(AvailabilityExceptionService.findAll(companyId, employeeId)).rejects.toBeInstanceOf(AppError);
  });

  it("retorna exceção por ID", async () => {
    const result = await AvailabilityExceptionService.findById(id, companyId);
    expect(result.id).toBe(id);
  });

  it("não expõe exceção de outra empresa", async () => {
    availabilityExceptionRepository.findById.mockResolvedValue(doc({ companyId: ref("507f1f77bcf86cd799439099") }));
    await expect(AvailabilityExceptionService.findById(id, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
  });

  it("rejeita exceção inexistente", async () => {
    availabilityExceptionRepository.findById.mockResolvedValue(null);
    await expect(AvailabilityExceptionService.findById(id, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
  });
});

describe("AvailabilityExceptionService.update", () => {
  it("mantém valores não enviados", async () => {
    const result = await AvailabilityExceptionService.update(id, { reason: "Nova justificativa" }, companyId);
    expect(result).toBeTruthy();
    expect(availabilityExceptionRepository.update).toHaveBeenCalledWith(id, expect.objectContaining({ employeeId, date: "2026-08-30", startTime: "10:00", endTime: "11:00", reason: "Nova justificativa" }));
  });

  it("limpa horários ao tornar o bloqueio de dia inteiro", async () => {
    await AvailabilityExceptionService.update(id, { allDay: true }, companyId);
    expect(availabilityExceptionRepository.update).toHaveBeenCalledWith(id, expect.objectContaining({ allDay: true, startTime: null, endTime: null }));
  });

  it("exige horários ao sair do dia inteiro", async () => {
    availabilityExceptionRepository.findById.mockResolvedValue(doc({ allDay: true, startTime: null, endTime: null }));
    await expect(AvailabilityExceptionService.update(id, { allDay: false }, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.BAD_REQUEST });
  });

  it("valida os novos horários", async () => {
    await expect(AvailabilityExceptionService.update(id, { startTime: "12:00", endTime: "11:00" }, companyId)).rejects.toBeInstanceOf(AppError);
  });

  it("não atualiza exceção de outra empresa", async () => {
    availabilityExceptionRepository.findById.mockResolvedValue(doc({ companyId: ref("507f1f77bcf86cd799439099") }));
    await expect(AvailabilityExceptionService.update(id, { reason: "x" }, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
  });

  it("propaga falha quando o registro é removido no meio da atualização", async () => {
    availabilityExceptionRepository.update.mockResolvedValue(null);
    await expect(AvailabilityExceptionService.update(id, { reason: "x" }, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
  });
});

describe("AvailabilityExceptionService.delete", () => {
  it("remove por soft delete", async () => {
    await AvailabilityExceptionService.delete(id, companyId);
    expect(availabilityExceptionRepository.softDelete).toHaveBeenCalledWith(id);
  });

  it("não remove exceção de outra empresa", async () => {
    availabilityExceptionRepository.findById.mockResolvedValue(doc({ companyId: ref("507f1f77bcf86cd799439099") }));
    await expect(AvailabilityExceptionService.delete(id, companyId)).rejects.toMatchObject({ statusCode: HttpStatus.NOT_FOUND });
    expect(availabilityExceptionRepository.softDelete).not.toHaveBeenCalled();
  });
});