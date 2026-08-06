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
import { TokenType } from "../../constants/token-type";

class TokenProvider {
  /**
   * Gera Access Token e Refresh Token.
   */
  public generate(payload: Omit<JwtPayload, "type">): AuthTokens {
    const accessToken = JwtProvider.generateAccessToken({
      ...payload,
      type: TokenType.ACCESS,
    });

    const refreshToken = JwtProvider.generateRefreshToken({
      ...payload,
      type: TokenType.REFRESH,
    });

    return {
      accessToken,
      refreshToken,
    };
  }
}

export default new TokenProvider();
