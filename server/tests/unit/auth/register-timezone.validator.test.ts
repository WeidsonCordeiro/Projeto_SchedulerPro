import { validationResult } from "express-validator";
import { describe, expect, it } from "vitest";
import { Request } from "express";
import { registerValidator } from "../../../src/modules/auth/validators/register.validator";

async function validate(timezone?: unknown) {
  const req = { body: {
    name: "Owner Teste",
    email: "owner@example.com",
    password: "password123",
    confirmPassword: "password123",
    company: timezone === undefined ? {} : { timezone },
  } } as Request;
  await Promise.all(registerValidator.map((validator) => validator.run(req)));
  return validationResult(req).array();
}

describe("registerValidator - timezone da empresa", () => {
  it("aceita registro sem timezone para aplicar o default no serviço/schema", async () => {
    expect(await validate()).toHaveLength(0);
  });

  it.each(["Europe/Lisbon", "Europe/London", "America/Sao_Paulo", "America/New_York", "UTC", "Asia/Tokyo"])(
    "aceita timezone válido %s",
    async (timezone) => expect(await validate(timezone)).toHaveLength(0),
  );

  it.each(["Invalid/Timezone", "Europe/Invalid", "NotATimezone"])(
    "rejeita timezone inválido %s",
    async (timezone) => expect(await validate(timezone)).not.toHaveLength(0),
  );
});
