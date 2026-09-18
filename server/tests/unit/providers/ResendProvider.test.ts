import { beforeEach, describe, expect, it, vi } from "vitest";

const { resendEmails, envMock } = vi.hoisted(() => {
  const send = vi.fn();
  return {
    resendEmails: { send },
    envMock: {
      email: { RESEND_API_KEY: "re_test", MAIL_FROM: "noreply@empresa.com" },
    },
  };
});

vi.mock("resend", () => ({
  Resend: vi.fn(function () {
    return { emails: resendEmails };
  }),
}));
vi.mock("../../../src/config/env", () => ({ env: envMock }));

import resendProvider from "../../../src/providers/mail/ResendProvider";
import { HttpStatus } from "../../../src/constants/http-status";

const payload = {
  to: "user@example.com",
  subject: "Assunto",
  html: "<p>ola</p>",
};

describe("ResendProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("envia usando o remetente configurável MAIL_FROM", async () => {
    resendEmails.send.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await resendProvider.send(payload);

    expect(resendEmails.send).toHaveBeenCalledWith({
      from: "noreply@empresa.com",
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });
  });

  it("não lança quando a API aceita o envio", async () => {
    resendEmails.send.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await expect(resendProvider.send(payload)).resolves.toBeUndefined();
  });

  it("lança AppError quando a API rejeita o envio (error presente)", async () => {
    resendEmails.send.mockResolvedValue({
      data: null,
      error: {
        message: "You can only send testing emails to your own email address",
        statusCode: 403,
        name: "validation_error",
      },
    });

    await expect(resendProvider.send(payload)).rejects.toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  });
});