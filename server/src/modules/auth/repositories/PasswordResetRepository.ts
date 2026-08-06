/**

* ==========================================================
* Arquivo: PasswordResetRepository.ts
* ---
* Responsabilidade:
*
* Gerenciar a persistência dos tokens de recuperação
* de palavra-passe.
*
* ==========================================================
  */

import PasswordReset, {
  PasswordResetDocument,
} from "../models/PasswordReset.model";

class PasswordResetRepository {
  /**
   * ==========================================================
   * Cria um novo token.
   * ==========================================================
   */
  public async create(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<PasswordResetDocument> {
    return PasswordReset.create(data);
  }

  /**
    
    * ==========================================================
    * Procura um token válido.
    * ==========================================================
      */
  public async findByToken(
    token: string
  ): Promise<PasswordResetDocument | null> {
    return PasswordReset.findOne({
      token,
      usedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    });
  }

  /**
    
    * ==========================================================
    * Invalida um token.
    * ==========================================================
      */
  public async invalidate(token: string): Promise<void> {
    await PasswordReset.findOneAndUpdate({ token }, { usedAt: new Date() });
  }

  /**
    
    * ==========================================================
    * Remove tokens expirados.
    * ==========================================================
      */
  public async deleteExpired(): Promise<void> {
    await PasswordReset.deleteMany({
      expiresAt: {
        $lt: new Date(),
      },
    });
  }
}

export default new PasswordResetRepository();
