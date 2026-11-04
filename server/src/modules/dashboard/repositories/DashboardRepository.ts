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
  ): Record<string, unknown> {
    return {
      companyId: new Types.ObjectId(companyId),
      deletedAt: null,
      startAt: {
        $gte: range.startAt,
        $lt: range.endAt,
      },
    };
  }

  public async findStatusCounts(
    companyId: string | Types.ObjectId,
    range: DashboardRange,
  ): Promise<StatusCountRow[]> {
    const pipeline: PipelineStage[] = [
      { $match: this.buildStartAtRangeMatch(companyId, range) },
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ];

    return Appointment.aggregate(pipeline);
  }

  public async findAppointmentsInPeriod(
    companyId: string | Types.ObjectId,
    range: DashboardRange,
  ): Promise<AppointmentDocument[]> {
    return Appointment.find(this.buildStartAtRangeMatch(companyId, range)).sort({
      startAt: 1,
    });
  }

  public async findUpcoming(
    companyId: string | Types.ObjectId,
    now: Date,
    limit: number,
  ): Promise<AppointmentDocument[]> {
    return Appointment.find({
      companyId,
      deletedAt: null,
      status: {
        $in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED],
      },
      startAt: { $gte: now },
    })
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
