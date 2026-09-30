import { beforeEach, describe, expect, it, vi } from "vitest";

const { reportRepository } = vi.hoisted(() => ({
  reportRepository: {
    findStatusCounts: vi.fn(),
    findRevenue: vi.fn(),
    findTopServices: vi.fn(),
    findEmployeeMetrics: vi.fn(),
    findClientMetrics: vi.fn(),
  },
}));

vi.mock("../../../src/modules/reports/repositories/ReportRepository", () => ({
  default: reportRepository,
}));

import ReportService from "../../../src/modules/reports/services/ReportService";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const companyId = "507f1f77bcf86cd799439011";

const id = (value: string) => ({
  toString: () => value,
});

const range = {
  startAt: new Date("2026-09-01T00:00:00.000Z"),
  endAt: new Date("2026-10-01T00:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReportService", () => {
  describe("getOverview", () => {
    it("devolve contagens por status com todos os status zerados e total", async () => {
      reportRepository.findStatusCounts.mockResolvedValue([
        { status: AppointmentStatus.COMPLETED, count: 3 },
        { status: AppointmentStatus.CANCELLED, count: 5 },
      ]);

      const result = await ReportService.getOverview(companyId, range);

      expect(reportRepository.findStatusCounts).toHaveBeenCalledWith(
        companyId,
        range,
      );
      expect(result.total).toBe(8);
      expect(result.byStatus).toEqual({
        [AppointmentStatus.SCHEDULED]: 0,
        [AppointmentStatus.CONFIRMED]: 0,
        [AppointmentStatus.COMPLETED]: 3,
        [AppointmentStatus.CANCELLED]: 5,
        [AppointmentStatus.NO_SHOW]: 0,
      });
    });

    it("ignora status desconhecidos na contagem", async () => {
      reportRepository.findStatusCounts.mockResolvedValue([
        { status: "inventado", count: 99 },
      ]);

      const result = await ReportService.getOverview(companyId);

      expect(result.total).toBe(99);
      expect(result.byStatus).toEqual({
        [AppointmentStatus.SCHEDULED]: 0,
        [AppointmentStatus.CONFIRMED]: 0,
        [AppointmentStatus.COMPLETED]: 0,
        [AppointmentStatus.CANCELLED]: 0,
        [AppointmentStatus.NO_SHOW]: 0,
      });
    });
  });

  describe("getRevenue", () => {
    it("devolve zeros quando não há agendamentos no período", async () => {
      reportRepository.findRevenue.mockResolvedValue(null);

      const result = await ReportService.getRevenue(companyId, range);

      expect(result).toEqual({
        completedCount: 0,
        estimatedRevenue: 0,
        forecastCount: 0,
        forecastRevenue: 0,
      });
    });

    it("devolve os totais agregados do período", async () => {
      reportRepository.findRevenue.mockResolvedValue({
        completedCount: 4,
        estimatedRevenue: 120,
        forecastCount: 3,
        forecastRevenue: 75,
      });

      const result = await ReportService.getRevenue(companyId, range);

      expect(result).toEqual({
        completedCount: 4,
        estimatedRevenue: 120,
        forecastCount: 3,
        forecastRevenue: 75,
      });
      expect(reportRepository.findRevenue).toHaveBeenCalledWith(companyId, range);
    });
  });

  describe("getTopServices", () => {
    const row = {
      serviceId: id("507f1f77bcf86cd799439013"),
      name: "Corte de cabelo",
      count: 10,
      completedCount: 6,
      estimatedRevenue: 90,
    };

    it("aplica o limite padrão e converte o serviceId para string", async () => {
      reportRepository.findTopServices.mockResolvedValue([row]);

      const result = await ReportService.getTopServices(companyId, range);

      expect(reportRepository.findTopServices).toHaveBeenCalledWith(
        companyId,
        range,
        5,
      );
      expect(result).toEqual([
        {
          serviceId: "507f1f77bcf86cd799439013",
          name: "Corte de cabelo",
          count: 10,
          completedCount: 6,
          estimatedRevenue: 90,
        },
      ]);
    });

    it("limita o limite entre 1 e 20", async () => {
      reportRepository.findTopServices.mockResolvedValue([]);

      await ReportService.getTopServices(companyId, range, 0);
      expect(reportRepository.findTopServices).toHaveBeenLastCalledWith(
        companyId,
        range,
        1,
      );

      await ReportService.getTopServices(companyId, range, 50);
      expect(reportRepository.findTopServices).toHaveBeenLastCalledWith(
        companyId,
        range,
        20,
      );

      await ReportService.getTopServices(companyId, range, 3.9);
      expect(reportRepository.findTopServices).toHaveBeenLastCalledWith(
        companyId,
        range,
        3,
      );
    });
  });

  describe("getEmployees", () => {
    it("mapeia as métricas dos funcionários", async () => {
      reportRepository.findEmployeeMetrics.mockResolvedValue([
        {
          employeeId: id("507f1f77bcf86cd799439014"),
          name: "Ana",
          count: 8,
          completedCount: 5,
          cancelledCount: 2,
          estimatedRevenue: 100,
        },
      ]);

      const result = await ReportService.getEmployees(companyId, range);

      expect(reportRepository.findEmployeeMetrics).toHaveBeenCalledWith(
        companyId,
        range,
      );
      expect(result).toEqual([
        {
          employeeId: "507f1f77bcf86cd799439014",
          name: "Ana",
          count: 8,
          completedCount: 5,
          cancelledCount: 2,
          estimatedRevenue: 100,
        },
      ]);
    });
  });

  describe("getClients", () => {
    it("trata facetas vazias no período", async () => {
      reportRepository.findClientMetrics.mockResolvedValue({
        totalClients: 0,
        recurringCount: 0,
        topClients: [],
      });

      const result = await ReportService.getClients(companyId, range);

      expect(result).toEqual({
        totalClients: 0,
        recurringCount: 0,
        topClients: [],
      });
      expect(reportRepository.findClientMetrics).toHaveBeenCalledWith(
        companyId,
        range,
        5,
      );
    });

    it("mapeia o ranking de clientes recorrentes", async () => {
      reportRepository.findClientMetrics.mockResolvedValue({
        totalClients: 3,
        recurringCount: 2,
        topClients: [
          {
            clientId: id("507f1f77bcf86cd799439015"),
            name: "Maria",
            count: 4,
            completedCount: 3,
            estimatedRevenue: 60,
          },
        ],
      });

      const result = await ReportService.getClients(companyId, range, 5);

      expect(result.topClients).toEqual([
        {
          clientId: "507f1f77bcf86cd799439015",
          name: "Maria",
          count: 4,
          completedCount: 3,
          estimatedRevenue: 60,
        },
      ]);
    });
  });

  describe("getCancellations", () => {
    it("calcula o percentual de cancelamentos", async () => {
      reportRepository.findStatusCounts.mockResolvedValue([
        { status: AppointmentStatus.COMPLETED, count: 15 },
        { status: AppointmentStatus.CANCELLED, count: 5 },
      ]);

      const result = await ReportService.getCancellations(companyId, range);

      expect(result).toEqual({
        total: 20,
        cancelledCount: 5,
        cancellationRate: 25,
      });
    });

    it("devolve taxa 0 quando não há agendamentos", async () => {
      reportRepository.findStatusCounts.mockResolvedValue([]);

      const result = await ReportService.getCancellations(companyId);

      expect(result).toEqual({
        total: 0,
        cancelledCount: 0,
        cancellationRate: 0,
      });
    });

    it("arredonda a taxa para duas casas decimais", async () => {
      reportRepository.findStatusCounts.mockResolvedValue([
        { status: AppointmentStatus.CANCELLED, count: 1 },
        { status: AppointmentStatus.COMPLETED, count: 6 },
      ]);

      const result = await ReportService.getCancellations(companyId);

      expect(result.cancellationRate).toBe(14.29);
    });
  });
});