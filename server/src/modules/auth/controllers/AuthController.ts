/**
 * ==========================================================
 * Arquivo: AuthController.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Receber as requisições HTTP relacionadas à autenticação.
 *
 * O Controller não possui regra de negócio.
 *
 * Responsabilidades:
 *
 * • Receber Request
 * • Chamar o AuthService
 * • Configurar cookies
 * • Retornar Response
 *
 * ==========================================================
 */

import { Request, Response } from "express";
import AuthService from "../services/AuthService";
import CookieProvider from "../../../providers/security/CookieProvider";
import { ResponseHandler } from "../../../utils/response";
import { AppError } from "../../../errors/AppError";
import { HttpStatus } from "../../../constants/http-status";
import { HttpMessages } from "../../../constants/http-messages";

class AuthController {
  /**
   * ======================================================
   * Registro de uma nova empresa e usuário OWNER.
   * ======================================================
   */
  public async register(req: Request, res: Response): Promise<Response> {
    const result = await AuthService.register(req.body);

    CookieProvider.setAccessToken(res, result.tokens.accessToken);

    CookieProvider.setRefreshToken(res, result.tokens.refreshToken);

    return ResponseHandler.success(res, result.user);
  }

  /**
   * ======================================================
   * Login do usuário.
   * ======================================================
   */
  public async login(req: Request, res: Response): Promise<Response> {
    const result = await AuthService.login(req.body);

    CookieProvider.setAccessToken(res, result.tokens.accessToken);

    CookieProvider.setRefreshToken(res, result.tokens.refreshToken);

    return ResponseHandler.success(res, result.user);
  }

  /**
   * ======================================================
   * Usuário autenticado.
   * ======================================================
   */
  public async me(req: Request, res: Response): Promise<Response> {
    const user = await AuthService.me(req.user!.userId);

    return ResponseHandler.success(res, user);
  }

  /**
   * ======================================================
   * Atualiza os tokens de autenticação.
   * ======================================================
   */
  public async refresh(req: Request, res: Response): Promise<Response> {
    const refreshToken = CookieProvider.getRefreshToken(req);

    if (!refreshToken) {
      throw new AppError(
        HttpMessages.INVALID_REFRESH_TOKEN,
        HttpStatus.UNAUTHORIZED
      );
    }

    const result = await AuthService.refresh(refreshToken);

    CookieProvider.setAccessToken(res, result.tokens.accessToken);

    CookieProvider.setRefreshToken(res, result.tokens.refreshToken);

    return ResponseHandler.success(res, result.user, HttpMessages.SUCCESS);
  }

  /**
   * ======================================================
   * Realiza o logout do usuário.
   * ======================================================
   */
  public async logout(_: Request, res: Response): Promise<Response> {
    CookieProvider.clearAuth(res);

    return ResponseHandler.success(res, null, HttpMessages.LOGOUT_SUCCESS);
  }

  /**
   * ==========================================================
   * Solicita a recuperação da palavra-passe.
   * ==========================================================
   */
  public async forgotPassword(req: Request, res: Response): Promise<Response> {
    await AuthService.forgotPassword(req.body.email);

    return ResponseHandler.success(
      res,
      null,
      "Se o e-mail existir, as instruções serão enviadas." // Ainda nao será enviado email
    );
  }

  /**
   * ==========================================================
   * Redefine a palavra-passe do utilizador.
   * ==========================================================
   */
  public async resetPassword(req: Request, res: Response): Promise<Response> {
    const { token, password } = req.body;

    await AuthService.resetPassword(token, password);

    return ResponseHandler.success(
      res,
      null,
      "Palavra-passe alterada com sucesso." // Ainda nao será enviado email
    );
  }
}

export default new AuthController();
