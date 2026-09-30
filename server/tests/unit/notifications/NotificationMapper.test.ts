import { describe, expect, it } from "vitest";
import NotificationMapper from "../../../src/modules/notifications/mappers/NotificationMapper";
import { NotificationType } from "../../../src/modules/notifications";

const ref = (id: string) => ({ toString: () => id });

const notification = {
  _id: ref("507f1f77bcf86cd799439015"),
  companyId: ref("507f1f77bcf86cd799439011"),
  userId: ref("507f1f77bcf86cd799439016"),
  type: NotificationType.APPOINTMENT_CREATED,
  title: "Novo agendamento",
  message: "Maria — Corte de cabelo em 30/08/2026 às 18:00.",
  readAt: new Date("2026-08-30T18:05:00.000Z"),
  metadata: {
    appointmentId: ref("appt-id"),
    clientId: ref("client-id"),
    serviceId: ref("service-id"),
    employeeId: ref("employee-id"),
  },
  createdAt: new Date("2026-08-30T17:00:00.000Z"),
  updatedAt: new Date("2026-08-30T17:05:00.000Z"),
};

describe("NotificationMapper", () => {
  it("transforma uma notificação completa em resposta da API", () => {
    expect(NotificationMapper.toResponse(notification)).toEqual({
      id: "507f1f77bcf86cd799439015",
      companyId: "507f1f77bcf86cd799439011",
      userId: "507f1f77bcf86cd799439016",
      type: NotificationType.APPOINTMENT_CREATED,
      title: "Novo agendamento",
      message: "Maria — Corte de cabelo em 30/08/2026 às 18:00.",
      readAt: "2026-08-30T18:05:00.000Z",
      metadata: {
        appointmentId: "appt-id",
        clientId: "client-id",
        serviceId: "service-id",
        employeeId: "employee-id",
      },
      createdAt: "2026-08-30T17:00:00.000Z",
      updatedAt: "2026-08-30T17:05:00.000Z",
    });
  });

  it("usa null para metadados/leitura ausentes", () => {
    const { metadata: _metadata, readAt: _readAt, ...rest } = notification;

    expect(
      NotificationMapper.toResponse({
        ...rest,
        readAt: null,
      } as typeof notification),
    ).toEqual({
      id: "507f1f77bcf86cd799439015",
      companyId: "507f1f77bcf86cd799439011",
      userId: "507f1f77bcf86cd799439016",
      type: NotificationType.APPOINTMENT_CREATED,
      title: "Novo agendamento",
      message: "Maria — Corte de cabelo em 30/08/2026 às 18:00.",
      readAt: null,
      metadata: {
        appointmentId: null,
        clientId: null,
        serviceId: null,
        employeeId: null,
      },
      createdAt: "2026-08-30T17:00:00.000Z",
      updatedAt: "2026-08-30T17:05:00.000Z",
    });
  });
});