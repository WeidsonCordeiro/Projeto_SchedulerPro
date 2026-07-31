/**
 * ==========================================================
 * Arquivo: CookieProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar toda manipulação dos cookies da aplicação.
 *
 * Nenhum Controller ou Service deve utilizar
 * res.cookie() diretamente.
 *
 * ==========================================================
 */

import { Request, Response } from "express";
import { env } from "../../config/env";
import { CookieConfig } from "../../constants/cookie";

class CookieProvider {
  /**
   * Configuração padrão.
   */
  private readonly options = {
    httpOnly: true,
    secure: env.app.NODE_ENV === "production",
    sameSite: "strict" as const,
  };

  /**
   * ==========================================================
   * Obtém o Refresh Token.
   * ==========================================================
   */
  public getRefreshToken(req: Request): string | null {
    return req.cookies?.refreshToken ?? null;
  }

  /**
   * ------------------------------------------------------
   * Access Token
   * ------------------------------------------------------
   */
  public setAccessToken(res: Response, token: string): void {
    res.cookie(CookieConfig.ACCESS_TOKEN_NAME, token, {
      ...this.options,

      maxAge: CookieConfig.ACCESS_TOKEN_MAX_AGE,
    });
  }

  /**
   * ------------------------------------------------------
   * Refresh Token
   * ------------------------------------------------------
   */
  public setRefreshToken(res: Response, token: string): void {
    res.cookie(CookieConfig.REFRESH_TOKEN_NAME, token, {
      ...this.options,

      maxAge: CookieConfig.REFRESH_TOKEN_MAX_AGE,
    });
  }

  /**
   * ==========================================================
   * Remove todos os cookies de autenticação.
   *
   * • Access Token
   * • Refresh Token
   *
   * Utilizado no logout.
   * ==========================================================
   */
  public clearAuth(res: Response): void {
    res.clearCookie(CookieConfig.ACCESS_TOKEN_NAME);

    res.clearCookie(CookieConfig.REFRESH_TOKEN_NAME);
  }
}

export default new CookieProvider();
