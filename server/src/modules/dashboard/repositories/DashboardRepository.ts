import { PipelineStage, Types } from "mongoose";

import Appointment from "../../appointments/models/Appointment.model";
import Client from "../../Clients/models/Client.model";
import { AppointmentStatus } from "../../../constants/appointment-status";
import type { AppointmentDocument } from "../../appointments/models/Appointment.model";
import type { DashboardRange, StatusCountRow } from "../index";

class DashboardRepository {
  private buildStartAtRangeMatch(
    companyId: string | Types.ObjectId,
    range: DashboardRange,
    employeeId?: string | Types.ObjectId,
  ): Record<string, unknown> {
    const match: Record<string, unknown> = {
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
      startAt: {
        $gte: range.startAt,
        $lt: range.endAt,
      },
    };

    if (employeeId) {
      match.employeeId = new Types.ObjectId(employeeId);
    }

    return match;
  }

  public async findStatusCounts(
    companyId: string | Types.ObjectId,
    range: DashboardRange,
    employeeId?: string | Types.ObjectId,
  ): Promise<StatusCountRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: this.buildStartAtRangeMatch(companyId, range, employeeId) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ];

    return Appointment.aggregate(pipeline);
  }

  public async findAppointmentsInPeriod(
    companyId: string | Types.ObjectId,
    range: DashboardRange,
    employeeId?: string | Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    return Appointment.find(
      this.buildStartAtRangeMatch(companyId, range, employeeId),
    ).sort({
      startAt: 1,
    });
  }

  public async findUpcoming(
    companyId: string | Types.ObjectId,
    now: Date,
    limit: number,
    employeeId?: string | Types.ObjectId,
  ): Promise<AppointmentDocument[]> {
    const query: Record<string, unknown> = {
      companyId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: { $gte: now },
    };

    if (employeeId) {
      query.employeeId = employeeId;
    }

    return Appointment.find(query)
      .sort({ startAt: 1 })
      .limit(limit);
  }

  public async countActiveClients(
    companyId: string | Types.ObjectId,
  ): Promise<number> {
    return Client.countDocuments({
      companyId,
      deletedAt: null,
      isActive: true,
    });
  }
}

export default new DashboardRepository();
