import { beforeEach, describe, expect, it, vi } from "vitest";

const { appointment } = vi.hoisted(() => ({
  appointment: { findOne: vi.fn() },
}));

vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({
  default: appointment,
}));

import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";
import PublicAppointmentTokenProvider from "../../../src/providers/security/PublicAppointmentTokenProvider";

const appointmentId = "507f1f77bcf86cd799439021";
const TOKEN = "kJ8vQ2mNpR4xW7yLbT0cV6jHfD3qS8aZgE1uI5oK9nM";

/**
 * `findOne(...).select(...)` é encadeado, por isso o mock
 * precisa de reproduzir a cadeia completa do Mongoose.
 */
const queryMock = (result: unknown) => {
  const chain = { select: vi.fn() };

  chain.select.mockReturnValue(Promise.resolve(result));
  appointment.findOne.mockReturnValue(chain);

  return chain;
};

describe("AppointmentRepository - acesso público por token", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("findByPublicAccessTokenHash", () => {
    it("procura pelo hash exato e ignora agendamentos eliminados", async () => {
      queryMock(null);

      await AppointmentRepository.findByPublicAccessTokenHash(
        PublicAppointmentTokenProvider.hash(TOKEN),
      );

      expect(appointment.findOne).toHaveBeenCalledWith({
        publicAccessTokenHash: PublicAppointmentTokenProvider.hash(TOKEN),
        deletedAt: null,
      });
    });

    it("projeta explicitamente o hash, apesar de ser select: false", async () => {
      const chain = queryMock(null);

      await AppointmentRepository.findByPublicAccessTokenHash(
        PublicAppointmentTokenProvider.hash(TOKEN),
      );

      /**
       * `publicAccessTokenHash` é `select: false`: se o
       * repositório não o pedir, o valor nem chega ao serviço e
       * a resolução do link deixaria de funcionar.
       */
      expect(chain.select).toHaveBeenCalledWith("+publicAccessTokenHash");
    });

    it("devolve o agendamento encontrado", async () => {
      const found = { _id: appointmentId };
      queryMock(found);

      await expect(
        AppointmentRepository.findByPublicAccessTokenHash("sha256:x"),
      ).resolves.toBe(found);
    });

    it("devolve null quando não existe", async () => {
      queryMock(null);

      await expect(
        AppointmentRepository.findByPublicAccessTokenHash("sha256:x"),
      ).resolves.toBeNull();
    });
  });
});
