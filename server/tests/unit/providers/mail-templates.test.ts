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

describe("Link de gestão nos e-mails de agendamento", () => {
  const manageUrl = "https://app.exemplo/agendar/TOKEN_PUBLICO";
  const withLink = { ...data, publicManageUrl: manageUrl };

  it("inclui o link de gestão no e-mail de criação", () => {
    const html = appointmentCreatedEmail(withLink);

    expect(html).toContain("Gerenciar meu agendamento");
    expect(html).toContain(`href="${manageUrl}"`);
  });

  it("inclui o link de gestão no e-mail de alteração", () => {
    const html = appointmentUpdatedEmail(withLink);

    expect(html).toContain("Gerenciar meu agendamento");
    expect(html).toContain(`href="${manageUrl}"`);
  });

  it("inclui o link de gestão no e-mail de cancelamento", () => {
    const html = appointmentCancelledEmail(withLink);

    expect(html).toContain("Gerenciar meu agendamento");
    expect(html).toContain(`href="${manageUrl}"`);
  });

  it("omite o bloco quando não há link (agendamento administrativo)", () => {
    for (const render of [
      appointmentCreatedEmail,
      appointmentUpdatedEmail,
      appointmentCancelledEmail,
    ]) {
      const html = render(data);

      expect(html).not.toContain("Gerenciar meu agendamento");
      expect(html).not.toContain("href=");
      expect(html).not.toContain("/agendar/");
    }
  });

  it("omite o bloco quando o link é explicitamente nulo", () => {
    const html = appointmentCreatedEmail({
      ...data,
      publicManageUrl: null,
    });

    expect(html).not.toContain("Gerenciar meu agendamento");
    expect(html).not.toContain("undefined");
  });

  it("nunca deixa undefined, null nem [object Object] no corpo", () => {
    const html = appointmentCreatedEmail({
      ...data,
      serviceName: null,
      employeeName: null,
      notes: null,
      publicManageUrl: manageUrl,
    });

    expect(html).not.toContain("undefined");
    expect(html).not.toContain("null");
    expect(html).not.toContain("[object Object]");
    expect(html).not.toContain("NaN");
  });

  it("mantém os dados do agendamento para lá do link", () => {
    const html = appointmentCreatedEmail(withLink);

    expect(html).toContain("Maria");
    expect(html).toContain("Corte de cabelo");
    expect(html).toContain("Ana");
    expect(html).toContain("30/08/2026");
    expect(html).toContain("18:00 às 18:30");
    expect(html).toContain("salao do centro");
  });

  it("não injeta o hash do token em vez do token puro", () => {
    const html = appointmentCreatedEmail(withLink);

    expect(html).not.toContain("sha256:");
  });
});