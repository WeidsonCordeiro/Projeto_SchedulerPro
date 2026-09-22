import { Types } from "mongoose";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { aggregate } = vi.hoisted(() => ({
  aggregate: vi.fn(),
}));

vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({
  default: { aggregate },
}));

import ReportRepository from "../../../src/modules/reports/repositories/ReportRepository";

const companyId = "507f1f77bcf86cd799439011";
const RANGE = {
  startAt: "2026-09-01T09:00:00.000Z",
  endAt: "2026-09-30T23:00:00.000Z",
};

function pipelineOf(index: number = 0): Array<Record<string, unknown>> {
  return aggregate.mock.calls[index][0];
}

function matchStages(): Array<Record<string, unknown>> {
  return pipelineOf().filter((stage) => Object.prototype.hasOwnProperty.call(stage, "$match"));
}

function baseMatch(): Record<string, unknown> {
  return matchStages()[0].$match as Record<string, unknown>;
}

describe("ReportRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("findStatusCounts agrupa por status dentro do período", async () => {
    aggregate.mockResolvedValueOnce([]);

    await ReportRepository.findStatusCounts(companyId, RANGE);

    expect(aggregate).toHaveBeenCalledTimes(1);
    const pipeline = pipelineOf();
    expect(baseMatch()).toEqual({
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
      startAt: { $gte: RANGE.startAt, $lt: RANGE.endAt },
    });
    expect(
      pipeline.some(
        (stage) => (stage.$group as { _id?: string } | undefined)?._id === "$status",
      ),
    ).toBe(true);
  });

  it("findStatusCounts ignora filtro de período quando o range está vazio", async () => {
    aggregate.mockResolvedValueOnce([]);

    await ReportRepository.findStatusCounts(companyId);

    expect(baseMatch()).toEqual({
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
    });
  });

  it("findRevenue faz lookup do serviço e soma receitas estimadas", async () => {
    aggregate.mockResolvedValueOnce([
      {
        _id: null,
        completedCount: 2,
        estimatedRevenue: 40,
        forecastCount: 3,
        forecastRevenue: 60,
      },
    ]);

    const result = await ReportRepository.findRevenue(companyId, RANGE);

    expect(result?.estimatedRevenue).toBe(40);
    expect(result?.forecastRevenue).toBe(60);
    const lookup = pipelineOf().find((stage) => stage.$lookup)?.$lookup as {
      from: string;
    };
    expect(lookup.from).toBe("services");
  });

  it("findRevenue devolve null quando não há agendamentos", async () => {
    aggregate.mockResolvedValueOnce([]);

    await expect(ReportRepository.findRevenue(companyId, RANGE)).resolves.toBeNull();
  });

  it("findTopServices aplica o limite informado", async () => {
    aggregate.mockResolvedValueOnce([]);

    await ReportRepository.findTopServices(companyId, RANGE, 3);

    const pipeline = pipelineOf();
    expect(pipeline[pipeline.length - 1]).toEqual({ $limit: 3 });
  });

  it("findTopServices usa o limite padrão de 5", async () => {
    aggregate.mockResolvedValueOnce([]);

    await ReportRepository.findTopServices(companyId, RANGE);

    const pipeline = pipelineOf();
    expect(pipeline[pipeline.length - 1]).toEqual({ $limit: 5 });
  });

  it("findEmployeeMetrics remove clientes do ranking", async () => {
    aggregate.mockResolvedValueOnce([]);

    await ReportRepository.findEmployeeMetrics(companyId, RANGE);

    const matches = matchStages();
    expect(matches.some((stage) => (stage.$match as Record<string, unknown>).role)).toBe(true);
    const roleMatch = matches.find((stage) =>
      Object.prototype.hasOwnProperty.call(stage.$match, "role"),
    )?.$match as Record<string, unknown>;
    expect(roleMatch).toEqual({ role: { $ne: "CLIENT" } });
  });

  it("findEmployeeMetrics mantém a última projeção e ordenação", async () => {
    aggregate.mockResolvedValueOnce([]);

    await ReportRepository.findEmployeeMetrics(companyId, RANGE);

    const pipeline = pipelineOf();
    expect(pipeline).toContainEqual({ $sort: { count: -1, estimatedRevenue: -1, employeeId: 1 } });
  });

  it("findClientMetrics devolve zeros quando o facet está vazio", async () => {
    aggregate.mockResolvedValueOnce([]);

    await expect(ReportRepository.findClientMetrics(companyId, RANGE)).resolves.toEqual({
      totalClients: 0,
      recurringCount: 0,
      topClients: [],
    });
  });

  it("findClientMetrics mapeia o resultado do facet", async () => {
    aggregate.mockResolvedValueOnce([
      {
        stats: [{ totalClients: 4 }],
        recurring: [{ recurringCount: 2 }],
        topClients: [
          { clientId: "c1", name: "Maria", count: 5, completedCount: 4, estimatedRevenue: 60 },
        ],
      },
    ]);

    const result = await ReportRepository.findClientMetrics(companyId, RANGE);

    expect(result).toEqual({
      totalClients: 4,
      recurringCount: 2,
      topClients: [
        { clientId: "c1", name: "Maria", count: 5, completedCount: 4, estimatedRevenue: 60 },
      ],
    });
  });

  it("findClientMetrics aplica o limite no ranking de clientes", async () => {
    aggregate.mockResolvedValueOnce([{ stats: [], recurring: [], topClients: [] }]);

    await ReportRepository.findClientMetrics(companyId, RANGE, 3);

    const facet = pipelineOf().find((stage) => stage.$facet)?.$facet as {
      topClients: Array<{ $limit?: number }>;
    };
    expect(facet.topClients.at(-1)).toEqual({ $limit: 3 });
  });
});