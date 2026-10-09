/**
 * ==========================================================
 * Arquivo: ClientRoutes.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Registrar todas as rotas relacionadas aos clientes.
 *
 * Cada rota deve possuir:
 *
 * • Autenticação
 * • Permissão
 * • Validação quando necessário
 * • Controller
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Router } from "express";

import ClientController from "../controllers/ClientController";
import ClientInviteController from "../../client-invites/controllers/ClientInviteController";
import AuthMiddleware from "../../../middlewares/auth.middleware";
import { validateRequest } from "../../../middlewares/validation.middleware";
import { hasPermission } from "../../../middlewares/permission.middleware";
import { authorize } from "../../../middlewares/role.middleware";
import { Permission } from "../../../constants/permissions";
import { Role } from "../../../constants/roles";
import { createClientValidator } from "../validators/create-client.validator";
import { updateClientValidator } from "../validators/update-client.validator";
import { setClientCredentialsValidator } from "../validators/set-client-credentials.validator";
import { validateObjectId } from "../../../middlewares/object-id.middleware";
import PasswordChangeMiddleware from "../../../middlewares/require-password-change.middleware";
import { uploadSingleImage } from "../../../providers/images/imageUpload.middleware";

const router = Router();

/**
 * ==========================================================
 * Criar cliente
 * ==========================================================
 */
router.post(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.CLIENT_CREATE),
  createClientValidator,
  validateRequest,
  ClientController.create,
);

/**
 * ==========================================================
 * Listar clientes
 * ==========================================================
 */
router.get(
  "/",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.CLIENT_READ),
  ClientController.findAll,
);

/**
 * ==========================================================
 * Perfil do cliente autenticado no portal.
 *
 * Precisa estar registada antes de "/:id".
 * ==========================================================
 */
router.get(
  "/me",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  authorize(Role.CLIENT),
  ClientController.findMe,
);

/**
 * ==========================================================
 * Enviar convite de criação de conta ao cliente.
 *
 * Usa `authorize(OWNER, ADMIN)` — o RBAC existente — em vez
 * de `CLIENT_UPDATE`: esta permission pertence também ao
 * MANAGER, e o convite é deliberadamente restrito a quem
 * gere a empresa. Nenhuma permissão nova foi criada.
 * ==========================================================
 */
router.post(
  "/:id/invite",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  authorize(Role.OWNER, Role.ADMIN),
  ClientInviteController.create,
);

/**
 * ==========================================================
 * Definir credenciais de acesso do cliente ao portal.
 * ==========================================================
 */
router.post(
  "/:id/credentials",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  setClientCredentialsValidator,
  validateRequest,
  ClientController.setCredentials,
);

/**
 * ==========================================================
 * Enviar ou substituir a foto de um cliente.
 *
 * A foto usa a permission `CLIENT_UPDATE` já existente (a
 * foto faz parte da atualização do cliente). O tenant é
 * garantido no serviço; a empresa vem do token autenticado.
 * ==========================================================
 */
router.post(
  "/:id/photo",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.CLIENT_UPDATE),
  uploadSingleImage("photo"),
  ClientController.uploadPhoto,
);

/**
 * ==========================================================
 * Remover a foto de um cliente.
 *
 * Idempotente: um cliente sem foto é um estado válido e a
 * operação devolve sucesso sem chamar o storage.
 * ==========================================================
 */
router.delete(
  "/:id/photo",
  AuthMiddleware.authenticate,
  validateObjectId("id"),
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  hasPermission(Permission.CLIENT_UPDATE),
  ClientController.removePhoto,
);

/**
 * ==========================================================
 * Buscar cliente por ID
 * ==========================================================
 */
router.get(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_READ),
  ClientController.findById,
);

/**
 * ==========================================================
 * Atualizar cliente
 * ==========================================================
 */
router.patch(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  updateClientValidator,
  validateRequest,
  ClientController.update,
);

/**
 * ==========================================================
 * Desativar cliente
 * ==========================================================
 */
router.patch(
  "/:id/deactivate",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  ClientController.deactivate,
);

/**
 * ==========================================================
 * Ativar cliente
 * ==========================================================
 */
router.patch(
  "/:id/activate",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_UPDATE),
  ClientController.activate,
);

/**
 * ==========================================================
 * Remover cliente
 *
 * Soft delete.
 * ==========================================================
 */
router.delete(
  "/:id",
  AuthMiddleware.authenticate,
  PasswordChangeMiddleware.requirePasswordChangeCompleted,
  validateObjectId("id"),
  hasPermission(Permission.CLIENT_DELETE),
  ClientController.delete,
);

export default router;
