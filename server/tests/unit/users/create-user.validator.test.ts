import { validationResult } from "express-validator";
import { describe, expect, it } from "vitest";
import { Request } from "express";
import { createUserValidator } from "../../../src/modules/users/validators/create-user.validator";
import { Role } from "../../../src/constants/roles";

async function validate(body: Record<string, unknown>) {
  const req = { body } as Request;
  await Promise.all(createUserValidator.map((validator) => validator.run(req)));
  return validationResult(req).array();
}

const validPayload = {
  name: "Utilizador Teste",
  email: "user@example.com",
  password: "password123",
  confirmPassword: "password123",
  role: Role.EMPLOYEE,
};

describe("createUserValidator", () => {
  it("aceita um payload válido", async () => {
    expect(await validate(validPayload)).toHaveLength(0);
  });

  it.each(Object.values(Role))("aceita a role %s", async (role) => {
    expect(await validate({ ...validPayload, role })).toHaveLength(0);
  });

  it.each([
    ["name ausente", { name: undefined }],
    ["name vazio", { name: "" }],
    ["name somente whitespace", { name: "   " }],
    ["email inválido", { email: "not-an-email" }],
    ["password ausente", { password: undefined }],
    ["password abaixo do mínimo", { password: "short" }],
    ["confirmPassword diferente", { confirmPassword: "other-password" }],
    ["role inválida", { role: "SUPER_ADMIN" }],
  ])("rejeita %s", async (_, override) => {
    expect(await validate({ ...validPayload, ...override })).not.toHaveLength(0);
  });

  it("rejeita confirmação de senha ausente", async () => {
    expect(await validate({ ...validPayload, confirmPassword: undefined })).not.toHaveLength(0);
  });
});
