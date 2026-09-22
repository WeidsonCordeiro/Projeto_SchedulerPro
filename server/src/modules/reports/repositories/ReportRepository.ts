/**
 * ==========================================================
 * Arquivo: ReportRepository.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados dos relatórios
 * através de agregações MongoDB.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * Todas as consultas:
 *
 * • filtram por companyId (isolamento multiempresa);
 * • ignoram agendamentos soft-deleted (deletedAt != null);
 * • fazem lookup das referências históricas (Serviço,
 *   Funcionário, Cliente) mesmo que estas estejam
 *   soft-deleted, para não quebrar o relatório;
 * • usam apenas status já existentes no domínio.
 * ==========================================================
 */

import { PipelineStage, Types } from "mongoose";
import Appointment from "../../appointments/models/Appointment.model";
import { AppointmentStatus } from "../../../constants/appointment-status";
import { Role } from "../../../constants/roles";
import {
  ClientMetricsAggregate,
  DEFAULT_REPORT_LIMIT,
  RevenueAggregateRow,
  ReportRange,
  StatusCountRow,
  TopServiceRow,
  EmployeeRow,
} from "../index";

class ReportRepository {
  /**
   * Monta o filtro de período baseado no instante de início do
   * agendamento.
   *
   * Os agendamentos são contabilizados no período em que começam:
   * startAt >= range.startAt && startAt < range.endAt.
   */
  private buildBaseMatch(
    companyId: string | Types.ObjectId,
    range: ReportRange = {},
  ): Record<string, unknown> {
    const match: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
    };

    if (range.startAt || range.endAt) {
      const startFilter: Record<string, unknown> = {};
      if (range.startAt) {
        startFilter.$gte = range.startAt;
      }
      if (range.endAt) {
        startFilter.$lt = range.endAt;
      }
      match.startAt = startFilter;
    }

    return match;
  }

  /**
   * ==========================================================
   * Contagens de agendamentos por status no período.
   * ==========================================================
   */
  public async findStatusCounts(
    companyId: string | Types.ObjectId,
    range: ReportRange = {},
  ): Promise<StatusCountRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: this.buildBaseMatch(companyId, range) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ];

    return Appointment.aggregate(pipeline);
  }

  /**
   * ==========================================================
   * Receita estimada no período.
   *
   * O valor é estimado a partir do preço do serviço:
   *
   * • estimatedRevenue: soma dos preços dos agendamentos
   *   concluídos (status "completed");
   * • forecastRevenue: soma dos preços dos agendamentos
   *   previstos (status "scheduled"/"confirmed").
   *
   * Referências de serviço soft-deleted continuam sendo
   * devolvidas pelo lookup, evitando que o valor seja zerado.
   * ==========================================================
   */
  public async findRevenue(
    companyId: string | Types.ObjectId,
    range: ReportRange = {},
  ): Promise<RevenueAggregateRow | null> {
    const pipeline: PipelineStage[] = [
      { $match: this.buildBaseMatch(companyId, range) },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $addFields: {
          servicePrice: {
            $ifNull: [{ $arrayElemAt: ["$service.price", 0] }, 0],
          },
        },
      },
      {
        $group: {
          _id: null,
          completedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.COMPLETED] },
                1,
                0,
              ],
            },
          },
          estimatedRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.COMPLETED] },
                "$servicePrice",
                0,
              ],
            },
          },
          forecastCount: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      AppointmentStatus.SCHEDULED,
                      AppointmentStatus.CONFIRMED,
                    ],
                  ],
                },
                1,
                0,
              ],
            },
          },
          forecastRevenue: {
            $sum: {
              $cond: [
                {
                  $in: [
                    "$status",
                    [
                      AppointmentStatus.SCHEDULED,
                      AppointmentStatus.CONFIRMED,
                    ],
                  ],
                },
                "$servicePrice",
                0,
              ],
            },
          },
        },
      },
    ];

    const [row] = await Appointment.aggregate<RevenueAggregateRow>(pipeline);

    return row ?? null;
  }

  /**
   * ==========================================================
   * Ranking de serviços mais realizados no período.
   * ==========================================================
   */
  public async findTopServices(
    companyId: string | Types.ObjectId,
    range: ReportRange = {},
    limit: number = DEFAULT_REPORT_LIMIT,
  ): Promise<TopServiceRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: this.buildBaseMatch(companyId, range) },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $addFields: {
          serviceName: {
            $ifNull: [{ $arrayElemAt: ["$service.name", 0] }, null],
          },
          servicePrice: {
            $ifNull: [{ $arrayElemAt: ["$service.price", 0] }, 0],
          },
        },
      },
      {
        $group: {
          _id: "$serviceId",
          name: { $first: "$serviceName" },
          count: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.COMPLETED] },
                1,
                0,
              ],
            },
          },
          estimatedRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.COMPLETED] },
                "$servicePrice",
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          serviceId: "$_id",
          name: 1,
          count: 1,
          completedCount: 1,
          estimatedRevenue: 1,
        },
      },
      {
        $sort: { count: -1, estimatedRevenue: -1, serviceId: 1 },
      },
      { $limit: limit },
    ];

    return Appointment.aggregate<TopServiceRow>(pipeline);
  }

  /**
   * ==========================================================
   * Ranking de funcionários no período.
   *
   * Clientes (role CLIENT) nunca aparecem como funcionários.
   * ==========================================================
   */
  public async findEmployeeMetrics(
    companyId: string | Types.ObjectId,
    range: ReportRange = {},
  ): Promise<EmployeeRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: this.buildBaseMatch(companyId, range) },
      {
        $lookup: {
          from: "users",
          localField: "employeeId",
          foreignField: "_id",
          as: "employee",
        },
      },
      {
        $lookup: {
          from: "services",
          localField: "serviceId",
          foreignField: "_id",
          as: "service",
        },
      },
      {
        $addFields: {
          employeeName: {
            $ifNull: [{ $arrayElemAt: ["$employee.name", 0] }, null],
          },
          employeeRole: {
            $ifNull: [{ $arrayElemAt: ["$employee.role", 0] }, null],
          },
          servicePrice: {
            $ifNull: [{ $arrayElemAt: ["$service.price", 0] }, 0],
          },
        },
      },
      {
        $group: {
          _id: "$employeeId",
          name: { $first: "$employeeName" },
          role: { $first: "$employeeRole" },
          count: { $sum: 1 },
          completedCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.COMPLETED] },
                1,
                0,
              ],
            },
          },
          cancelledCount: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.CANCELLED] },
                1,
                0,
              ],
            },
          },
          estimatedRevenue: {
            $sum: {
              $cond: [
                { $eq: ["$status", AppointmentStatus.COMPLETED] },
                "$servicePrice",
                0,
              ],
            },
          },
        },
      },
      {
        $match: { role: { $ne: Role.CLIENT } },
      },
      {
        $project: {
          _id: 0,
          employeeId: "$_id",
          name: 1,
          count: 1,
          completedCount: 1,
          cancelledCount: 1,
          estimatedRevenue: 1,
        },
      },
      {
        $sort: { count: -1, estimatedRevenue: -1, employeeId: 1 },
      },
    ];

    return Appointment.aggregate<EmployeeRow>(pipeline);
  }

  /**
   * ==========================================================
   * Clientes recorrentes no período.
   *
   * • totalClients: clientes distintos com agendamento;
   * • recurringCount: clientes com 2 ou mais agendamentos;
   * • topClients: ranking dos clientes com mais agendamentos.
   * ==========================================================
   */
  public async findClientMetrics(
    companyId: string | Types.ObjectId,
    range: ReportRange = {},
    limit: number = DEFAULT_REPORT_LIMIT,
  ): Promise<ClientMetricsAggregate> {
    const baseMatch = this.buildBaseMatch(companyId, range);

    const pipeline: PipelineStage[] = [
      { $match: baseMatch },
      {
        $facet: {
          stats: [{ $group: { _id: "$clientId" } }, { $count: "totalClients" }],
          recurring: [
            { $group: { _id: "$clientId", n: { $sum: 1 } } },
            { $match: { n: { $gte: 2 } } },
            { $count: "recurringCount" },
          ],
          topClients: [
            {
              $lookup: {
                from: "clients",
                localField: "clientId",
                foreignField: "_id",
                as: "client",
              },
            },
            {
              $lookup: {
                from: "services",
                localField: "serviceId",
                foreignField: "_id",
                as: "service",
              },
            },
            {
              $addFields: {
                clientName: {
                  $ifNull: [{ $arrayElemAt: ["$client.name", 0] }, null],
                },
                servicePrice: {
                  $ifNull: [{ $arrayElemAt: ["$service.price", 0] }, 0],
                },
              },
            },
            {
              $group: {
                _id: "$clientId",
                name: { $first: "$clientName" },
                count: { $sum: 1 },
                completedCount: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", AppointmentStatus.COMPLETED] },
                      1,
                      0,
                    ],
                  },
                },
                estimatedRevenue: {
                  $sum: {
                    $cond: [
                      { $eq: ["$status", AppointmentStatus.COMPLETED] },
                      "$servicePrice",
                      0,
                    ],
                  },
                },
              },
            },
            {
              $project: {
                _id: 0,
                clientId: "$_id",
                name: 1,
                count: 1,
                completedCount: 1,
                estimatedRevenue: 1,
              },
            },
            { $sort: { count: -1, estimatedRevenue: -1, clientId: 1 } },
            { $limit: limit },
          ],
        },
      },
    ];

    const [result] = await Appointment.aggregate<{
      stats: { totalClients: number }[];
      recurring: { recurringCount: number }[];
      topClients: ClientMetricsAggregate["topClients"];
    }>(pipeline);

    return {
      totalClients: result?.stats?.[0]?.totalClients ?? 0,
      recurringCount: result?.recurring?.[0]?.recurringCount ?? 0,
      topClients: result?.topClients ?? [],
    };
  }
}

export default new ReportRepository();