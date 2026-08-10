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
import { UpdateUserDto } from "../dto/UpdateUser.dto";
import { ChangePasswordDto } from "../dto/ChangePassword.dto";
import ResendProvider from "../../../providers/mail/ResendProvider";
import { welcomeTemplate } from "../../../providers/mail/templates/welcome.template";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import Logger from "../../../providers/logger";
import { env } from "../../../config/env";
import { Role } from "../../../constants/roles";

class UserService {
  private readonly userRepository = UserRepository;
  private readonly passwordProvider = PasswordProvider;
  private readonly resendProvider = ResendProvider;
  private readonly companyRepository = CompanyRepository;

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
        HttpStatus.CONFLICT,
      );
    }

    const company = await this.companyRepository.findById(companyId);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const passwordHash = await this.passwordProvider.hash(dto.password);

    const user = await this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
      companyId: new Types.ObjectId(companyId),
      mustChangePassword: dto.role === Role.EMPLOYEE,
    });

    const loginUrl = `${env.frontend.FRONTEND_URL}/login`;

    const html = welcomeTemplate({
      name: user.name,
      companyName: company.name,
      loginUrl,
      temporaryPassword: dto.password,
    });

    try {
      await this.resendProvider.send({
        to: user.email,
        subject: "Bem-vindo ao SchedulerPro",
        html,
      });

      Logger.auth(`E-mail de boas-vindas enviado para ${user.email}`);
    } catch (error) {
      Logger.error(`Falha ao enviar e-mail de boas-vindas para ${user.email}`, {
        error: error instanceof Error ? error.message : String(error),
        userId: user._id.toString(),
        companyId: company._id.toString(),
      });
    }

    return UserMapper.toResponse(user);
  }

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
    console.log("UserService.findById - user:", user);
    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (user.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }
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
        HttpStatus.FORBIDDEN,
      );
    }
    await this.userRepository.softDelete(id);
  }

  /**
   * ==========================================================
   * Atualizar um utilizador.
   * ==========================================================
   */
  public async update(id: string, dto: UpdateUserDto, companyId: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    if (user.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }
    const updatedUser = await this.userRepository.update(id, dto);
    return UserMapper.toResponse(updatedUser!);
  }

  /**
   * ==========================================================
   * Ativa um utilizador.
   * ==========================================================
   */
  public async activate(id: string, companyId: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedUser = await this.userRepository.activate(id);

    return UserMapper.toResponse(updatedUser!);
  }

  /**
   * ==========================================================
   * Desativa um utilizador.
   * ==========================================================
   */
  public async deactivate(id: string, companyId: string) {
    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.companyId.toString() !== companyId) {
      throw new AppError(
        HttpMessages.USER_NOT_PREVILEGES,
        HttpStatus.FORBIDDEN,
      );
    }

    const updatedUser = await this.userRepository.deactivate(id);

    return UserMapper.toResponse(updatedUser!);
  }

  /**
   * ==========================================================
   * Atualiza a senha de um utilizador.
   * ==========================================================
   */
  public async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<void> {
    const user = await this.userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const isValidPassword = await this.passwordProvider.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isValidPassword) {
      throw new AppError(
        HttpMessages.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    const passwordHash = await this.passwordProvider.hash(dto.newPassword);

    await this.userRepository.updatePassword(user.id, passwordHash);
  }
}

export default new UserService();
