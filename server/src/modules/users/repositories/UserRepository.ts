/**
 * ==========================================================
 * Arquivo: UserRepository.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Camada responsável por acessar os dados dos usuários.
 *
 * Nenhuma regra de negócio deve existir aqui.
 *
 * ==========================================================
 */

import { Types } from "mongoose";
import User from "../models/User.model";
import { CreateUserData, UpdateUserData } from "../types";
import { UserDocument } from "../models/User.model";
import { ClientSession } from "mongoose";

class UserRepository {
  /**
   * Busca por ID.
   */
  public async findById(id: string | Types.ObjectId) {
    return User.findById(id);
  }

  /**
   * Busca por email.
   *
   * Inclui passwordHash para autenticação.
   */
  public async findByEmail(email: string): Promise<UserDocument | null> {
    return User.findOne({
      email: email,
      deletedAt: null,
    }).select("+passwordHash");
  }

  /**
   * Verifica existência por email.
   */
  public async existsByEmail(email: string): Promise<boolean> {
    const exists = await User.exists({
      email: email,
      deletedAt: null,
    });

    return exists !== null;
  }

  /**
   * Cria usuário.
   */
  public async create(
    data: CreateUserData,
    session?: ClientSession,
  ): Promise<UserDocument> {
    const [user] = await User.create([data], { session });

    return user;
  }

  /**
   * Atualiza usuário.
   */
  public async update(id: string, data: UpdateUserData) {
    return User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
  }

  /**
   * Soft Delete.
   */
  public async softDelete(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      deletedAt: new Date(),
    });
  }

  /**
   * Atualiza data do último login.
   */
  public async updateLastLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      lastLogin: new Date(),
    });
  }

  /**
   * Reseta tentativas de login.
   */
  public async resetFailedLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      failedLoginAttempts: 0,
      lockUntil: null,
    });
  }

  /**
   * Incrementa tentativas de login.
   */
  public async incrementFailedLogin(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      $inc: {
        failedLoginAttempts: 1,
      },
    });
  }

  /**
   * Bloqueia usuário.
   */
  public async lockUser(id: string, until: Date): Promise<void> {
    await User.findByIdAndUpdate(id, {
      lockUntil: until,
    });
  }

  /**
   * ==========================================================
   * Busca todos os usuários de uma empresa.
   * ==========================================================
   */
  public async findByCompanyId(
    companyId: string | Types.ObjectId,
  ): Promise<UserDocument[]> {
    return User.find({
      companyId,
      deletedAt: null,
    });
  }

  /**
   * ==========================================================
   * Ativa um utilizador.
   * ==========================================================
   */
  public async activate(id: string) {
    return User.findByIdAndUpdate(id, { isActive: true }, { new: true });
  }

  /**
   * ==========================================================
   * Desativa um utilizador.
   * ==========================================================
   */
  public async deactivate(id: string) {
    return User.findByIdAndUpdate(id, { isActive: false }, { new: true });
  }

  /**
   * ==========================================================
   * Atualiza a senha de um utilizador.
   * ==========================================================
   */
  public async updatePassword(id: string, passwordHash: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      passwordHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    });
  }
  /**
   * ==========================================================
   * Procura um utilizador por ID incluindo a palavra-passe.
   * ==========================================================
   */
  public async findByIdWithPassword(
    id: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return User.findById(id).select("+passwordHash");
  }

  /**
   * ==========================================================
   * Busca dados necessários para controle de acesso.
   * ==========================================================
   */
  public async findByIdForAccessControl(
    id: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return User.findById(id).select(
      "_id mustChangePassword isActive deletedAt",
    );
  }
  /**
   * ==========================================================
   * Marca o e-mail do utilizador como verificado.
   * ==========================================================
   */
  public async verifyEmail(id: string): Promise<void> {
    await User.findByIdAndUpdate(id, {
      emailVerified: true,
    });
  }
}

export default new UserRepository();
