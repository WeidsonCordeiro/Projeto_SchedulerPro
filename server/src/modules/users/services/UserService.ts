/**
 * ==========================================================
 * Arquivo: UserService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas
 * aos utilizadores.
 *
 * ==========================================================
 */

import { CreateUserDto } from "../dto/CreateUser.dto";
import UserRepository from "../repositories/UserRepository";
import UserMapper from "../mappers/UserMapper";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import PasswordProvider from "../../../providers/security/PasswordProvider";
import { Types } from "mongoose";
class UserService {
  private readonly userRepository = UserRepository;
  private readonly passwordProvider = PasswordProvider;

  /**
   * ==========================================================
   * Lista todos os utilizadores.
   * ==========================================================
   */
  public async findAll(companyId: string) {
    const users = await this.userRepository.findByCompanyId(companyId);

    return users.map(UserMapper.toResponse);
  }

  /**
   * ==========================================================
   * Procura um utilizador pelo ID.
   * ==========================================================
   */

  public async findById(id: string, companyId: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (user.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN
      );
    }
    return UserMapper.toResponse(user);
  }

  /**
   * ==========================================================
   * Cria um novo utilizador.
   * ==========================================================
   */
  public async create(dto: CreateUserDto, companyId: string) {
    const exists = await this.userRepository.existsByEmail(dto.email);
    if (exists) {
      throw new AppError(
        HttpMessages.EMAIL_ALREADY_EXISTS,
        HttpStatus.CONFLICT
      );
    }
    const passwordHash = await this.passwordProvider.hash(dto.password);
    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      companyId: new Types.ObjectId(companyId),
    });
    return UserMapper.toResponse(user);
  }

  /**
   * ==========================================================
   * Remove um utilizador.
   * ==========================================================
   */
  public async delete(id: string, companyId: string): Promise<void> {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (user.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN
      );
    }
    await this.userRepository.softDelete(id);
  }
}

export default new UserService();
