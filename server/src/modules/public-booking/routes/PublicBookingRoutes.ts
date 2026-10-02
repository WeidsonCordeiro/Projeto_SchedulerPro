/**

* ==========================================================
* Arquivo: PublicBookingRoutes.ts
* ---
* Responsabilidade:
*
* Rotas PÚBLICAS de catálogo e disponibilidade
* (sem autenticação), da Stage 31 Parte 4.
*
*   GET /api/public/companies/:companyId/services
*   GET /api/public/companies/:companyId/employees
*   GET /api/public/companies/:companyId/availability
*
* ==========================================================
* ISOLAMENTO MULTI-TENANT
* ==========================================================
*
* O tenant é SEMPRE o `:companyId` da URL. Nenhuma destas rotas
* aceita `companyId` no corpo ou na query, e o validator da
* disponibilidade recusa explicitamente um `companyId` aí — não
* para o usar, mas para que não se suggestione que influence a
* consulta.
*
* ==========================================================
* ORDEM
* ==========================================================
*
* Igual à criação pública:
*
* 1. rate limit (antes de qualquer trabalho de base de dados);
* 2. validação do ObjectId do tenant;
* 3. validação dos parâmetros;
* 4. controller (regras de negócio).
*
* Sem `AuthMiddleware.authenticate`, `authorize` nem
* `hasPermission`: estas rotas são públicas por definição.
* ==========================================================
 */

import { Router } from "express";

import PublicBookingController from "../controllers/PublicBookingController";
import { publicAvailabilityValidator } from "../validators/public-availability.validator";

import { validateRequest } from "../../../middlewares/validation.middleware";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import {
  publicAvailabilityRateLimit,
  publicCatalogRateLimit,
} from "../../../middlewares/public-catalog-rate-limit.middleware";

const publicBookingRoutes = Router();

/**
 * ==========================================================
* Serviços ativos da empresa.
* ==========================================================
 */
publicBookingRoutes.get(
  "/companies/:companyId/services",
  publicCatalogRateLimit,
  validateObjectId("companyId"),
  PublicBookingController.listServices,
);

/**
 * ==========================================================
* Profissionais ativos da empresa.
* ==========================================================
 */
publicBookingRoutes.get(
  "/companies/:companyId/employees",
  publicCatalogRateLimit,
  validateObjectId("companyId"),
  PublicBookingController.listEmployees,
);

/**
 * ==========================================================
* Horários disponíveis.
*
* `validateObjectId` cobre `companyId`; o validator cobre
* `serviceId` e `employeeId` (também ObjectIds) e `date`.
* ==========================================================
 */
publicBookingRoutes.get(
  "/companies/:companyId/availability",
  publicAvailabilityRateLimit,
  validateObjectId("companyId"),
  publicAvailabilityValidator,
  validateRequest,
  PublicBookingController.getAvailability,
);

export default publicBookingRoutes;