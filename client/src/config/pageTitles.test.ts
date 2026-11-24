import { describe, expect, it } from "vitest";
import { resolvePageTitle } from "./pageTitles";

describe("resolvePageTitle", () => {
  it("maps exact admin paths", () => {
    expect(resolvePageTitle("/clients")).toBe("Clientes | SchedulerPro");
    expect(resolvePageTitle("/appointments")).toBe("Agendamentos | SchedulerPro");
  });

  it("maps public booking prefix", () => {
    expect(resolvePageTitle("/agendar/empresa/abc")).toBe(
      "Marcar atendimento | SchedulerPro",
    );
    expect(resolvePageTitle("/agendar/token-xyz")).toBe(
      "Seu agendamento | SchedulerPro",
    );
  });

  it("falls back to app name", () => {
    expect(resolvePageTitle("/unknown")).toBe("SchedulerPro");
  });
});