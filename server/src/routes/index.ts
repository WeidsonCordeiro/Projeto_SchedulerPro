/**
 * ==========================================================
 * Arquivo: routes/index.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar todas as rotas da API.
 *
 * Cada módulo (Auth, Users, Company...)
 * possuirá seu próprio arquivo de rotas.
 *
 * Este arquivo apenas importa e registra
 * todos eles.
 * ==========================================================
 */

import { Router } from "express";
import { ResponseHandler } from "../utils/response";
import authRoutes from "../modules/auth/routes/AuthRoutes";

const router = Router();

router.use("/auth", authRoutes);

/**
 * Health Check
 * ==========================================================
 * Para verificar se a API está viva.
 */
router.get("/health", (req, res) => {
  return ResponseHandler.success(
    res,

    {
      uptime: process.uptime(),
      timestamp: new Date(),
    },

    "API funcionando."
  );
});

export default router;
