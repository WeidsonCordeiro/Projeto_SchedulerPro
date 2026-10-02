/**

* ==========================================================
* Arquivo: public-availability.validator.ts
* ---
* Responsabilidade:
*
* Validar os parâmetros da consulta pública de horários.
*
* A validação é estrita por três razões:
*
* • a rota é pública, e um parâmetro malformado que chegue ao
*   serviço transformava-se num `undefined` silencioso;
* • `date` é uma data CALENDÁRICA, não um instante: não aceita
*   hora, fuso nem "hoje". `2026-02-30` e `2026-13-01` não
*   existem e têm de ser recusados aqui, antes de qualquer
*   consulta;
* • um parâmetro a mais do que o contrato não é ignorado em
*   silêncio, para que a superfície pública não possa ser
*   descoberta por tentativas.
*
* ==========================================================
 */

import { query } from "express-validator";

import { DateTime } from "luxon";

/** Parâmetros aceites. Tudo o resto é recusado. */
const ALLOWED_PARAMS = new Set(["serviceId", "employeeId", "date"]);

/** Data local da empresa, em ISO curto: "AAAA-MM-DD". */
const CALENDAR_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const publicAvailabilityValidator = [
  /**
   * Rejeita parâmetros fora do contrato.
   *
   * Em especial `companyId`: enviá-lo na query não muda o
   * tenant (que vem da rota), mas aceitar o parâmetro em
   * silêncio seria sugerir que ele influence a consulta.
   */
  query().custom((value: Record<string, unknown>) => {
    const unexpected = Object.keys(value).filter(
      (field) => !ALLOWED_PARAMS.has(field),
    );

    if (unexpected.length > 0) {
      throw new Error(
        `O pedido contém parâmetros não permitidos: ${unexpected.join(", ")}.`,
      );
    }

    return true;
  }),

  query("serviceId")
    .notEmpty()
    .withMessage("O serviço é obrigatório.")
    .isMongoId()
    .withMessage("ID do serviço inválido."),

  query("employeeId")
    .notEmpty()
    .withMessage("O funcionário é obrigatório.")
    .isMongoId()
    .withMessage("ID do funcionário inválido."),

  query("date")
    .notEmpty()
    .withMessage("A data é obrigatória.")
    .custom((value: unknown) => {
      if (typeof value !== "string" || !CALENDAR_DATE.test(value)) {
        throw new Error(
          "A data deve estar no formato AAAA-MM-DD (ex.: 2026-10-05).",
        );
      }

      /**
       * O formato passa, mas a data pode não existir. `DateTime`
       * devolve `isValid === false` para "2026-02-30"; e o
       * confronto do resultado com o valor recebido apanha o
       * caso em que o Luxon "corrige" a data em vez de a recusar.
       */
      const parsed = DateTime.fromISO(value);

      if (!parsed.isValid || parsed.toISODate() !== value) {
        throw new Error("A data informada não existe no calendário.");
      }

      return true;
    }),
];