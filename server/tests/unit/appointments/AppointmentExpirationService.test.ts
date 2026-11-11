import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointmentRepository, companyRepository, logger } = vi.hoisted(() => ({
  appointmentRepository: {
    cancelOverdueScheduled: vi.fn(),
  },
  companyRepository: {
    findAllActiveNotDeleted: vi.fn(),
  },
  logger: {
    system: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock(
  "../../../src/modules/appointments/repositories/AppointmentRepository",
  () => ({
    default: appointmentRepository,
  }),
);
vi.mock("../../../src/modules/companies/repositories/CompanyRepository", () => ({
  default: companyRepository,
}));
vi.mock("../../../src/providers/logger/Logger", () => ({
  default: logger,
}));

import AppointmentExpirationService from "../../../src/modules/appointments/services/AppointmentExpirationService";

const companyIdA = "507f1f77bcf86cd799439011";
const companyIdB = "507f1f77bcf86cd799439012";
const now = new Date("2026-09-01T12:00:00.000Z");

function companyDoc(id: string) {
  return {
    _id: { toString: () => id },
    deletedAt: null,
    isActive: true,
  };
}

describe("AppointmentExpirationService.processOverdueForAllCompanies", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([]);
    appointmentRepository.cancelOverdueScheduled.mockResolvedValue(0);
  });

  it("processa empresas ativas retornadas pelo repositório", async () => {
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([
      companyDoc(companyIdA),
      companyDoc(companyIdB),
    ]);
    appointmentRepository.cancelOverdueScheduled.mockResolvedValueOnce(1).mockResolvedValueOnce(2);

    const summary = await AppointmentExpirationService.processOverdueForAllCompanies(now);

    expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenCalledTimes(2);
    expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenNthCalledWith(
      1,
      companyIdA,
      now,
    );
    expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenNthCalledWith(
      2,
      companyIdB,
      now,
    );
    expect(summary.processedCompanies).toBe(2);
    expect(summary.totalCancelled).toBe(3);
    expect(summary.failedCompanies).toBe(0);
    expect(summary.referenceTime).toBe(now);
  });

  it("não chama cancel quando não há empresas elegíveis", async () => {
    const summary = await AppointmentExpirationService.processOverdueForAllCompanies(now);

    expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled();
    expect(summary.processedCompanies).toBe(0);
    expect(summary.totalCancelled).toBe(0);
    expect(summary.failedCompanies).toBe(0);
  });

  it("empresas inativas ou eliminadas não são retornadas pelo repositório", async () => {
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([
      companyDoc(companyIdA),
    ]);

    await AppointmentExpirationService.processOverdueForAllCompanies(now);

    expect(companyRepository.findAllActiveNotDeleted).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenCalledTimes(1);
    expect(appointmentRepository.cancelOverdueScheduled).toHaveBeenCalledWith(
      companyIdA,
      now,
    );
  });

  it("usa o mesmo instante now em todas as chamadas", async () => {
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([
      companyDoc(companyIdA),
      companyDoc(companyIdB),
    ]);

    await AppointmentExpirationService.processOverdueForAllCompanies(now);

    for (const call of appointmentRepository.cancelOverdueScheduled.mock.calls) {
      expect(call[1]).toBe(now);
    }
  });

  it("soma os modifiedCount retornados pelo repositório", async () => {
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([
      companyDoc(companyIdA),
      companyDoc(companyIdB),
    ]);
    appointmentRepository.cancelOverdueScheduled.mockResolvedValueOnce(3).mockResolvedValueOnce(5);

    const summary = await AppointmentExpirationService.processOverdueForAllCompanies(now);

    expect(summary.totalCancelled).toBe(8);
  });

  it("continua após falha em uma empresa e regista erro", async () => {
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([
      companyDoc(companyIdA),
      companyDoc(companyIdB),
    ]);
    appointmentRepository.cancelOverdueScheduled
      .mockResolvedValueOnce(4)
      .mockRejectedValueOnce(new Error("db down"));

    const summary = await AppointmentExpirationService.processOverdueForAllCompanies(now);

    expect(summary.processedCompanies).toBe(1);
    expect(summary.totalCancelled).toBe(4);
    expect(summary.failedCompanies).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        companyId: companyIdB,
        context: "AppointmentExpirationService.cancelOverdueScheduled",
      }),
    );
  });

  it("propaga falha ao listar empresas", async () => {
    companyRepository.findAllActiveNotDeleted.mockRejectedValue(
      new Error("list failed"),
    );

    await expect(
      AppointmentExpirationService.processOverdueForAllCompanies(now),
    ).rejects.toThrow("list failed");

    expect(logger.error).toHaveBeenCalled();
    expect(appointmentRepository.cancelOverdueScheduled).not.toHaveBeenCalled();
  });

  it("regista resumo estruturado em Logger.system", async () => {
    companyRepository.findAllActiveNotDeleted.mockResolvedValue([
      companyDoc(companyIdA),
    ]);
    appointmentRepository.cancelOverdueScheduled.mockResolvedValue(2);

    await AppointmentExpirationService.processOverdueForAllCompanies(now);

    expect(logger.system).toHaveBeenCalledWith(
      "Expiração multiempresa de agendamentos concluída",
      {
        processedCompanies: 1,
        totalCancelled: 2,
        failedCompanies: 0,
        referenceTime: now.toISOString(),
      },
    );
  });
});
