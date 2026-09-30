import { AvailabilityExceptionDocument } from "../models/AvailabilityException.model";

class AvailabilityExceptionMapper {
  public static toResponse(item: AvailabilityExceptionDocument) {
    return {
      id: item._id.toString(),
      companyId: item.companyId.toString(),
      employeeId: item.employeeId.toString(),
      date: item.date,
      allDay: item.allDay,
      startTime: item.startTime ?? null,
      endTime: item.endTime ?? null,
      type: item.type,
      reason: item.reason ?? null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export default AvailabilityExceptionMapper;