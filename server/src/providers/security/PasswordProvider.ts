/**
 * ==========================================================
 * Arquivo: PasswordProvider.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar toda manipulação de senhas.
 *
 * Nenhuma outra camada da aplicação deve utilizar
 * bcrypt diretamente.
 *
 * ==========================================================
 */

import bcrypt from "bcryptjs";

class PasswordProvider {
  /**
   * Número de rounds.
   */
  private readonly saltRounds = 12;

  /**
   * Gera hash.
   */
  public async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Compara senha.
   */
  public async compare(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }
}

export default new PasswordProvider();
