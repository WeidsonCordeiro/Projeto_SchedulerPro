import { describe, expect, it } from "vitest";

import UserMapper from "../../../src/modules/users/mappers/UserMapper";
import { Role } from "../../../src/constants/roles";
import type { UserDocument } from "../../../src/modules/users/models/User.model";

/**
 * ==========================================================
 * Forma do funcionário devolvido pela API.
 *
 * A foto é `{ url, publicId }` ou `null` — nunca uma string.
 * ==========================================================
 */

function userDocument(overrides: Record<string, unknown> = {}) {
  return {
    id: "507f1f77bcf86cd799439012",
    name: "Funcionário",
    email: "func@example.com",
    role: Role.EMPLOYEE,
    isActive: true,
    companyId: "507f1f77bcf86cd799439011",
    avatar: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    passwordHash: "hash-que-nao-deve-sair",
    ...overrides,
  } as unknown as UserDocument;
}

describe("UserMapper.toResponse - avatar", () => {
  it("devolve avatar null quando o funcionário não tem foto", () => {
    const response = UserMapper.toResponse(userDocument({ avatar: null }));

    expect(response.avatar).toBeNull();
  });

  it("devolve avatar null quando o campo está ausente no documento", () => {
    const document = userDocument();
    delete (document as unknown as Record<string, unknown>).avatar;

    expect(UserMapper.toResponse(document).avatar).toBeNull();
  });

  it("devolve o par { url, publicId } quando existe foto", () => {
    const avatar = {
      url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/employee/abc",
      publicId: "schedulerpro/employee/abc",
    };

    const response = UserMapper.toResponse(userDocument({ avatar }));

    expect(response.avatar).toEqual(avatar);
  });

  it("nunca expõe a passwordHash", () => {
    const response = UserMapper.toResponse(userDocument());

    expect(response).not.toHaveProperty("passwordHash");
  });

  it("expõe apenas o contrato da foto, sem metadados do storage", () => {
    const response = UserMapper.toResponse(
      userDocument({
        avatar: {
          url: "https://res.cloudinary.com/demo/x.jpg",
          publicId: "schedulerpro/employee/x",
          bytes: 1024,
          version: 1700000000,
          signature: "segredo",
        },
      }),
    );

    expect(Object.keys(response.avatar as object).sort()).toEqual(["publicId", "url"]);
  });
});
