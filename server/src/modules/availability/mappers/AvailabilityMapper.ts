import { EmployeeAvailabilityDocument } from "../models/EmployeeAvailability.model";

class AvailabilityMapper {
  public static toResponse(item: EmployeeAvailabilityDocument) {
    return {
      id: item._id.toString(),
      companyId: item.companyId.toString(),
      employeeId: item.employeeId.toString(),
      dayOfWeek: item.dayOfWeek,
      morningStart: item.morningStart,
      morningEnd: item.morningEnd,
      afternoonStart: item.afternoonStart,
      afternoonEnd: item.afternoonEnd,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}

export default AvailabilityMapper;
