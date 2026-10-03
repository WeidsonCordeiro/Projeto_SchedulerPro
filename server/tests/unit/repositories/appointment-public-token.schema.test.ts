import { describe, expect, it } from "vitest";

import AppointmentModel from "../../../src/modules/appointments/models/Appointment.model";

/**
 * Metadados do schema: o que garante que o token puro não é
 * persistido e que dois agendamentos não podem partilhar o
 * mesmo hash.
 *
 * Não é necessária qualquer ligação à base de dados: só se lê
 * a definição do schema.
 */
describe("Appointment - schema do token público", () => {
  it("mantém o ciphertext fora das leituras por omissão", () => {
    const field = AppointmentModel.schema.path("publicAccessTokenCiphertext");
    expect(field.options.select).toBe(false);
    expect(field.options.default).toBeNull();
  });
  it("guarda o hash fora das leituras por omissão", () => {
    const field = AppointmentModel.schema.path("publicAccessTokenHash");

    expect(field.options.select).toBe(false);
  });

  it("tem null como valor por omissão", () => {
    const field = AppointmentModel.schema.path("publicAccessTokenHash");

    expect(field.options.default).toBeNull();
  });

  it("tem índice único parcial apenas sobre valores string", () => {
    expect(AppointmentModel.schema.indexes()).toContainEqual([
      { publicAccessTokenHash: 1 },
      {
        unique: true,
        partialFilterExpression: { publicAccessTokenHash: { $type: "string" } },
      },
    ]);
  });

  it("não usa índice único simples, que colidiria com os null", () => {
    const simpleUnique = AppointmentModel.schema.indexes().find(
      ([keys, options]) =>
        options?.unique === true &&
        !(options as { partialFilterExpression?: unknown })
          .partialFilterExpression &&
        Object.keys(keys as object).includes("publicAccessTokenHash"),
    );

    /**
     * Sem `partialFilterExpression`, o primeiro agendamento
     * administrativo (`null`) tornava-se um duplicado do
     * segundo e a criação passava a falhar.
     */
    expect(simpleUnique).toBeUndefined();
  });

  it("mantém o índice de agendamentos por cliente", () => {
    const keys = AppointmentModel.schema.indexes().map(([index]) => index);

    expect(keys).toContainEqual({
      companyId: 1,
      clientId: 1,
      startAt: 1,
    });
  });

  it("não expõe o token puro em nenhum campo", () => {
    const paths = Object.keys(AppointmentModel.schema.paths);

    expect(paths).not.toContain("publicAccessToken");
    expect(paths).not.toContain("publicToken");
    expect(paths).toContain("publicAccessTokenHash");
    expect(paths).toContain("publicAccessTokenCiphertext");
  });
});
