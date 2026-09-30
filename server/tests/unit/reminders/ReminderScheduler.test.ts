import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { reminderService, logger } = vi.hoisted(() => ({
  reminderService: { processDueReminders: vi.fn() },
  logger: { system: vi.fn(), error: vi.fn() },
}));

vi.mock("../../../src/modules/reminders/services/ReminderService", () => ({
  default: reminderService,
}));
vi.mock("../../../src/providers/logger/Logger", () => ({
  default: logger,
}));

import { ReminderScheduler } from "../../../src/modules/reminders/scheduler/ReminderScheduler";

const emptySummary = { checked: 0, sent: 0, skipped: 0, failed: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  reminderService.processDueReminders.mockResolvedValue(emptySummary);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ReminderScheduler", () => {
  it("executa uma rodada e registra o resumo", async () => {
    reminderService.processDueReminders.mockResolvedValue({
      checked: 3,
      sent: 2,
      skipped: 1,
      failed: 0,
    });

    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    await scheduler.run();

    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(1);
    expect(logger.system).toHaveBeenCalledWith(
      expect.stringContaining("2 enviados"),
    );
  });

  it("nunca lança quando o processamento falha", async () => {
    reminderService.processDueReminders.mockRejectedValue(new Error("boom"));

    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it("normaliza falha sem instância de Error antes de registrar", async () => {
    reminderService.processDueReminders.mockRejectedValue("boom");

    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    await scheduler.run();

    expect(logger.error).toHaveBeenCalledWith(expect.any(Error), {
      context: "ReminderScheduler.run",
    });
  });

  it("stop sem start é um no-op", async () => {
    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    await expect(scheduler.stop()).resolves.toBeUndefined();
  });

  it("ignora execuções sobrepostas", async () => {
    let resolve!: () => void;
    reminderService.processDueReminders.mockReturnValue(
      new Promise<void>((r) => {
        resolve = r;
      }),
    );

    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    const first = scheduler.run();
    const second = scheduler.run();

    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(1);

    resolve();
    await first;
    await second;

    await scheduler.run();

    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(2);
  });

  it("inicia com execução imediata e repete no intervalo; stop encerra", async () => {
    vi.useFakeTimers();

    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    scheduler.start();

    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(1000);
    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(2);

    await scheduler.stop();

    await vi.advanceTimersByTimeAsync(3000);
    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(2);
  });

  it("start chamado duas vezes não duplica o intervalo", async () => {
    vi.useFakeTimers();

    const scheduler = new ReminderScheduler(reminderService as never, 1000);

    scheduler.start();
    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(reminderService.processDueReminders).toHaveBeenCalledTimes(2);

    await scheduler.stop();
  });
});