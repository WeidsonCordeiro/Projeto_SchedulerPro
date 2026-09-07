import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { findOne: vi.fn(), findOneAndUpdate: vi.fn() },
  service: { findOneAndUpdate: vi.fn() },
  appointment: { findOneAndUpdate: vi.fn() },
}));

vi.mock("../../../src/modules/users/models/User.model", () => ({ default: mocks.user }));
vi.mock("../../../src/modules/services/models/Service.model", () => ({ default: mocks.service }));
vi.mock("../../../src/modules/appointments/models/Appointment.model", () => ({ default: mocks.appointment }));

import UserRepository from "../../../src/modules/users/repositories/UserRepository";
import ServiceRepository from "../../../src/modules/services/repositories/ServiceRepository";
import AppointmentRepository from "../../../src/modules/appointments/repositories/AppointmentRepository";
import { AppointmentStatus } from "../../../src/constants/appointment-status";

const id = "507f1f77bcf86cd799439011";
const activeFilter = { _id: id, deletedAt: null };

describe("soft delete nos repositories", () => {
  beforeEach(() => vi.clearAllMocks());

  it("UserRepository.findById ignora usuário deletado", async () => {
    mocks.user.findOne.mockResolvedValue(null);
    await expect(UserRepository.findById(id)).resolves.toBeNull();
    expect(mocks.user.findOne).toHaveBeenCalledWith(activeFilter);
  });

  it("UserRepository.softDelete filtra e grava uma data", async () => {
    await UserRepository.softDelete(id);
    const [filter, update] = mocks.user.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(activeFilter);
    expect(update.deletedAt).toBeInstanceOf(Date);
  });

  it("UserRepository.update filtra usuários deletados", async () => {
    await UserRepository.update(id, { name: "Novo" });
    expect(mocks.user.findOneAndUpdate).toHaveBeenCalledWith(
      activeFilter,
      { name: "Novo" },
      { new: true, runValidators: true },
    );
  });

  it.each([
    ["activate", () => UserRepository.activate(id), { isActive: true }],
    ["deactivate", () => UserRepository.deactivate(id), { isActive: false }],
    ["updatePassword", () => UserRepository.updatePassword(id, "hash"), { passwordHash: "hash" }],
    ["verifyEmail", () => UserRepository.verifyEmail(id), { emailVerified: true }],
  ])("UserRepository.%s filtra usuários deletados", async (_name, operation, update) => {
    await operation();
    const [filter, sentUpdate] = mocks.user.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(activeFilter);
    expect(sentUpdate).toEqual(expect.objectContaining(update));
  });

  it("UserRepository.findByIdWithPassword não retorna usuário deletado", async () => {
    const select = vi.fn().mockResolvedValue(null);
    mocks.user.findOne.mockReturnValue({ select });
    await expect(UserRepository.findByIdWithPassword(id)).resolves.toBeNull();
    expect(mocks.user.findOne).toHaveBeenCalledWith(activeFilter);
    expect(select).toHaveBeenCalledWith("+passwordHash");
  });

  it("UserRepository.findByIdForAccessControl não retorna usuário deletado", async () => {
    const select = vi.fn().mockResolvedValue(null);
    mocks.user.findOne.mockReturnValue({ select });
    await expect(UserRepository.findByIdForAccessControl(id)).resolves.toBeNull();
    expect(mocks.user.findOne).toHaveBeenCalledWith(activeFilter);
    expect(select).toHaveBeenCalledWith("_id mustChangePassword isActive deletedAt");
  });

  it("AppointmentRepository.updateStatus filtra agendamentos deletados", async () => {
    await AppointmentRepository.updateStatus(id, AppointmentStatus.CONFIRMED);
    expect(mocks.appointment.findOneAndUpdate).toHaveBeenCalledWith(
      activeFilter,
      { status: AppointmentStatus.CONFIRMED },
      { new: true, runValidators: true },
    );
  });

  it("AppointmentRepository.update filtra agendamentos deletados", async () => {
    await AppointmentRepository.update(id, { notes: "Atualizado" });
    expect(mocks.appointment.findOneAndUpdate).toHaveBeenCalledWith(
      activeFilter,
      { notes: "Atualizado" },
      { new: true, runValidators: true },
    );
  });

  it("AppointmentRepository.softDelete filtra e grava uma data", async () => {
    await AppointmentRepository.softDelete(id);
    const [filter, update] = mocks.appointment.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(activeFilter);
    expect(update.deletedAt).toBeInstanceOf(Date);
  });

  it("ServiceRepository.softDelete filtra e grava uma data", async () => {
    await ServiceRepository.softDelete(id);
    const [filter, update] = mocks.service.findOneAndUpdate.mock.calls[0];
    expect(filter).toEqual(activeFilter);
    expect(update.deletedAt).toBeInstanceOf(Date);
  });
});
