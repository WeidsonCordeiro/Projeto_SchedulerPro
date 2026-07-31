/**
 * ==========================================================
 * Arquivo: TokenProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar a geração dos tokens utilizados
 * pela autenticação.
 *
 * Este provider conhece o fluxo da autenticação,
 * mas não conhece jsonwebtoken.
 *
 * ==========================================================
 */

import JwtProvider from "./JwtProvider";
import { AuthTokens, JwtPayload } from "./types";

class TokenProvider {
  /**
   * Gera Access Token e Refresh Token.
   */
  public generate(payload: Omit<JwtPayload, "type">): AuthTokens {
    const accessToken = JwtProvider.generateAccessToken({
      ...payload,
      type: "access",
    });

    const refreshToken = JwtProvider.generateRefreshToken({
      ...payload,
      type: "refresh",
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export default new TokenProvider();
