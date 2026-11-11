import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { expirationService, logger } = vi.hoisted(() => ({
  expirationService: {
    processOverdueForAllCompanies: vi.fn(),
  },
  logger: {
    system: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock(
  "../../../src/modules/appointments/services/AppointmentExpirationService",
  () => ({
    default: expirationService,
  }),
);
vi.mock("../../../src/providers/logger/Logger", () => ({
  default: logger,
}));

import { AppointmentExpirationScheduler } from "../../../src/modules/appointments/scheduler/AppointmentExpirationScheduler";

const emptySummary = {
  processedCompanies: 0,
  totalCancelled: 0,
  failedCompanies: 0,
  referenceTime: new Date("2026-09-01T12:00:00.000Z"),
};

beforeEach(() => {
  vi.clearAllMocks();
  expirationService.processOverdueForAllCompanies.mockResolvedValue(emptySummary);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("AppointmentExpirationScheduler", () => {
  it("executa uma rodada e regista o resumo", async () => {
    expirationService.processOverdueForAllCompanies.mockResolvedValue({
      processedCompanies: 2,
      totalCancelled: 5,
      failedCompanies: 0,
      referenceTime: new Date("2026-09-01T00:00:00.000Z"),
    });

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    await scheduler.run();

    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      1,
    );
    expect(logger.system).toHaveBeenCalledWith(
      "AppointmentExpirationScheduler: rodada concluída",
      expect.objectContaining({
        processedCompanies: 2,
        totalCancelled: 5,
        failedCompanies: 0,
      }),
    );
  });

  it("nunca lança quando o processamento falha", async () => {
    expirationService.processOverdueForAllCompanies.mockRejectedValue(
      new Error("boom"),
    );

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    await expect(scheduler.run()).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(expect.any(Error), {
      context: "AppointmentExpirationScheduler.run",
    });
  });

  it("normaliza falha sem instância de Error antes de registrar", async () => {
    expirationService.processOverdueForAllCompanies.mockRejectedValue("boom");

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    await scheduler.run();

    expect(logger.error).toHaveBeenCalledWith(expect.any(Error), {
      context: "AppointmentExpirationScheduler.run",
    });
  });

  it("stop sem start encerra e regista uma vez", async () => {
    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    await expect(scheduler.stop()).resolves.toBeUndefined();
    expect(logger.system).toHaveBeenCalledWith(
      "AppointmentExpirationScheduler encerrado",
    );
    await scheduler.stop();
    expect(logger.system).toHaveBeenCalledTimes(1);
  });

  it("ignora execuções sobrepostas", async () => {
    let resolve!: () => void;
    expirationService.processOverdueForAllCompanies.mockReturnValue(
      new Promise<typeof emptySummary>((r) => {
        resolve = () => r(emptySummary);
      }),
    );

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    const first = scheduler.run();
    const second = scheduler.run();

    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      1,
    );

    resolve();
    await first;
    await second;

    await scheduler.run();

    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      2,
    );
  });

  it("inicia com execução imediata e repete no intervalo; stop encerra", async () => {
    vi.useFakeTimers();

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    scheduler.start();

    expect(logger.system).toHaveBeenCalledWith(
      "AppointmentExpirationScheduler iniciado",
      { intervalMs: 1000 },
    );
    await vi.waitFor(() =>
      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      ),
    );

    await vi.advanceTimersByTimeAsync(1000);
    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      2,
    );

    await scheduler.stop();

    await vi.advanceTimersByTimeAsync(3000);
    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      2,
    );
  });

  it("start chamado duas vezes não duplica o intervalo", async () => {
    vi.useFakeTimers();

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      1000,
    );

    scheduler.start();
    scheduler.start();

    await vi.advanceTimersByTimeAsync(1000);
    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      2,
    );

    await scheduler.stop();
  });

  it("usa o intervalo configurado no constructor", async () => {
    vi.useFakeTimers();

    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      2500,
    );

    scheduler.start();
    await vi.waitFor(() =>
      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      ),
    );

    await vi.advanceTimersByTimeAsync(2500);
    expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
      2,
    );

    await scheduler.stop();
  });

  it("regista início de rodada", async () => {
    const scheduler = new AppointmentExpirationScheduler(
      expirationService as never,
      500,
    );

    await scheduler.run();

    expect(logger.system).toHaveBeenCalledWith(
      "AppointmentExpirationScheduler: início da rodada",
      { intervalMs: 500 },
    );
  });

  describe("encerramento seguro (E2.1)", () => {
    it("stop() aguarda a execução em andamento antes de registar encerrado", async () => {
      let resolveService!: () => void;
      expirationService.processOverdueForAllCompanies.mockImplementation(
        () =>
          new Promise<typeof emptySummary>((r) => {
            resolveService = () => r(emptySummary);
          }),
      );

      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      const running = scheduler.run();
      const stopping = scheduler.stop();

      expect(logger.system).not.toHaveBeenCalledWith(
        "AppointmentExpirationScheduler encerrado",
      );

      resolveService();
      await running;
      await stopping;

      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      );
      expect(logger.system).toHaveBeenCalledWith(
        "AppointmentExpirationScheduler encerrado",
      );
    });

    it("stop() durante execução impede ticks futuros", async () => {
      vi.useFakeTimers();

      let resolveService!: () => void;
      expirationService.processOverdueForAllCompanies.mockImplementation(
        () =>
          new Promise<typeof emptySummary>((r) => {
            resolveService = () => r(emptySummary);
          }),
      );

      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      scheduler.start();
      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      );

      const stopPromise = scheduler.stop();
      resolveService();
      await stopPromise;

      await vi.advanceTimersByTimeAsync(5000);

      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      );
    });

    it("run() após stop() não chama o serviço", async () => {
      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      await scheduler.stop();
      await scheduler.run();

      expect(expirationService.processOverdueForAllCompanies).not.toHaveBeenCalled();
    });

    it("start() após stop() não recria o intervalo", async () => {
      vi.useFakeTimers();

      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      scheduler.start();
      await vi.waitFor(() =>
        expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
          1,
        ),
      );
      await scheduler.stop();

      scheduler.start();
      await vi.advanceTimersByTimeAsync(5000);

      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      );
    });

    it("stop() duplicado é seguro", async () => {
      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      scheduler.start();
      await scheduler.stop();
      await expect(scheduler.stop()).resolves.toBeUndefined();

      const encerrado = logger.system.mock.calls.filter(
        (call) => call[0] === "AppointmentExpirationScheduler encerrado",
      );
      expect(encerrado).toHaveLength(1);
    });

    it("erro na execução não impede stop() de concluir", async () => {
      expirationService.processOverdueForAllCompanies.mockRejectedValue(
        new Error("boom"),
      );

      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      const running = scheduler.run();
      const stopping = scheduler.stop();

      await running;
      await stopping;

      expect(logger.system).toHaveBeenCalledWith(
        "AppointmentExpirationScheduler encerrado",
      );

      await scheduler.run();
      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        1,
      );
    });

    it("liberta running após erro e permite nova rodada antes de stop", async () => {
      expirationService.processOverdueForAllCompanies
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce(emptySummary);

      const scheduler = new AppointmentExpirationScheduler(
        expirationService as never,
        1000,
      );

      await scheduler.run();
      await scheduler.run();

      expect(expirationService.processOverdueForAllCompanies).toHaveBeenCalledTimes(
        2,
      );
    });
  });
});
