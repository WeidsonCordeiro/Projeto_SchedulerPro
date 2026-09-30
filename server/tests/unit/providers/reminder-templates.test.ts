import { describe, expect, it } from "vitest";
import { reminder24hEmail } from "../../../src/providers/mail/templates/reminder-24h.template";
import { reminder2hEmail } from "../../../src/providers/mail/templates/reminder-2h.template";
import { ReminderEmailData } from "../../../src/providers/mail/templates/reminder-email-layout";

const data: ReminderEmailData = {
  clientName: "Maria",
  companyName: "salao do centro",
  serviceName: "Corte de cabelo",
  employeeName: "Ana",
  dateLabel: "31/08/2026",
  timeLabel: "11:00",
  endTimeLabel: "11:30",
};

describe("E-mails de lembrete", () => {
  it("renderiza o lembrete de 24h com os dados do agendamento", () => {
    const html = reminder24hEmail(data);

    expect(html).toContain("Seu agendamento é em 24 horas");
    expect(html).toContain("Maria");
    expect(html).toContain("salao do centro");
    expect(html).toContain("Corte de cabelo");
    expect(html).toContain("Ana");
    expect(html).toContain("31/08/2026");
    expect(html).toContain("11:00 às 11:30");
  });

  it("renderiza o lembrete de 2h", () => {
    const html = reminder2hEmail(data);

    expect(html).toContain("Seu agendamento é em 2 horas");
    expect(html).toContain("Maria");
  });

  it("usa valores neutros quando serviço/funcionário não são informados", () => {
    const html = reminder24hEmail({
      ...data,
      serviceName: null,
      employeeName: null,
    });

    expect(html).toContain("Serviço:</strong> -");
    expect(html).toContain("Profissional:</strong> -");
  });
});