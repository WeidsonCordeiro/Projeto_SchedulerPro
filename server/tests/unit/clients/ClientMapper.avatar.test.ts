import { describe, expect, it } from "vitest";

import ClientMapper from "../../../src/modules/Clients/mappers/ClientMapper";
import type { ClientDocument } from "../../../src/modules/Clients/models/Client.model";

/**
 * ==========================================================
 * Forma do cliente devolvido pela API.
 *
 * A foto é `{ url, publicId }` ou `null` — nunca uma string,
 * nunca um buffer, nunca metadados do storage.
 * ==========================================================
 */

function clientDocument(overrides: Record<string, unknown> = {}) {
  return {
    _id: { toString: () => "507f1f77bcf86cd799439015" },
    name: "Cliente",
    email: "cliente@example.com",
    phone: "912345678",
    companyId: { toString: () => "507f1f77bcf86cd799439011" },
    notes: null,
    avatar: null,
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-02"),
    ...overrides,
  } as unknown as ClientDocument;
}

describe("ClientMapper.toResponse - avatar", () => {
  it("devolve avatar null quando o cliente não tem foto", () => {
    const response = ClientMapper.toResponse(clientDocument({ avatar: null }));

    expect(response.avatar).toBeNull();
  });

  it("devolve avatar null quando o campo está ausente no documento", () => {
    const document = clientDocument();
    delete (document as unknown as Record<string, unknown>).avatar;

    expect(ClientMapper.toResponse(document).avatar).toBeNull();
  });

  it("devolve o par { url, publicId } quando existe foto", () => {
    const avatar = {
      url: "https://res.cloudinary.com/demo/image/upload/v1/schedulerpro/client/abc",
      publicId: "schedulerpro/client/abc",
    };

    const response = ClientMapper.toResponse(clientDocument({ avatar }));

    expect(response.avatar).toEqual(avatar);
  });

  it("expõe apenas o contrato da foto, sem metadados do storage", () => {
    const response = ClientMapper.toResponse(
      clientDocument({
        avatar: {
          url: "https://res.cloudinary.com/demo/x.jpg",
          publicId: "schedulerpro/client/x",
          bytes: 1024,
          version: 1700000000,
          signature: "segredo",
        },
      }),
    );

    expect(Object.keys(response.avatar as object).sort()).toEqual(["publicId", "url"]);
  });

  it("preserva o contrato existente do cliente", () => {
    const response = ClientMapper.toResponse(clientDocument());

    expect(Object.keys(response).sort()).toEqual([
      "avatar",
      "companyId",
      "createdAt",
      "email",
      "id",
      "isActive",
      "name",
      "notes",
      "phone",
      "portalAccess",
      "updatedAt",
    ]);
  });
});