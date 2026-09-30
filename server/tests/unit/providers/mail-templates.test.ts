import { describe, expect, it } from "vitest";
import { appointmentCreatedEmail } from "../../../src/providers/mail/templates/appointment-created.template";
import { appointmentUpdatedEmail } from "../../../src/providers/mail/templates/appointment-updated.template";
import { appointmentCancelledEmail } from "../../../src/providers/mail/templates/appointment-cancelled.template";
import { AppointmentEmailData } from "../../../src/providers/mail/templates/appointment-email-layout";

const data: AppointmentEmailData = {
  clientName: "Maria",
  companyName: "salao do centro",
  serviceName: "Corte de cabelo",
  employeeName: "Ana",
  dateLabel: "30/08/2026",
  timeLabel: "18:00",
  endTimeLabel: "18:30",
  notes: "Janela",
};

describe("E-mails de agendamento", () => {
  it("renderiza o e-mail de criação com os dados do agendamento", () => {
    const html = appointmentCreatedEmail(data);

    expect(html).toContain("Agendamento confirmado");
    expect(html).toContain("Maria");
    expect(html).toContain("salao do centro");
    expect(html).toContain("Corte de cabelo");
    expect(html).toContain("Ana");
    expect(html).toContain("30/08/2026");
    expect(html).toContain("18:00 às 18:30");
    expect(html).toContain("Janela");
  });

  it("renderiza o e-mail de atualização", () => {
    const html = appointmentUpdatedEmail({
      ...data,
      notes: undefined,
    });

    expect(html).toContain("Agendamento atualizado");
    expect(html).toContain("Maria");
    expect(html).not.toContain("Observações");
  });

  it("renderiza o e-mail de cancelamento", () => {
    const html = appointmentCancelledEmail(data);

    expect(html).toContain("Agendamento cancelado");
    expect(html).toContain("Maria");
  });

  it("usa valores neutros quando serviço/funcionário não são informados", () => {
    const html = appointmentCreatedEmail({
      ...data,
      serviceName: null,
      employeeName: null,
    });

    expect(html).toContain("Serviço:</strong> -");
    expect(html).toContain("Profissional:</strong> -");
  });
});