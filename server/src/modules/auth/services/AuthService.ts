/**
 * ==========================================================
 * Arquivo: AuthService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar toda a regra de negócio referente à
 * autenticação dos usuários.
 *
 * O AuthService não conhece Express e não acessa o banco
 * diretamente. Toda persistência é realizada através do
 * UserRepository.
 *
 * Responsabilidades deste serviço:
 *
 * • Validar credenciais
 * • Verificar status do usuário
 * • Gerar Access Token
 * • Gerar Refresh Token
 * • Atualizar informações de login
 * • Registrar eventos de autenticação
 *
 * Fluxo principal:
 *
 * login()
 *    │
 *    ├── findUserByEmail()
 *    ├── validatePassword()
 *    ├── validateUserStatus()
 *    ├── generateTokens()
 *    ├── updateLoginInfo()
 *
 * Este serviço será utilizado por:
 *
 * • AuthController
 * • Refresh Token
 * • Logout
 * • Recuperação de Senha
 * • Alteração de Senha
 *
 * ==========================================================
 */

import UserRepository from "../../users/repositories/UserRepository";
import PasswordProvider from "../../../providers/security/PasswordProvider";
import JwtProvider from "../../../providers/security/JwtProvider";
import { AuthTokens } from "../../../providers/security/types";
import Logger from "../../../providers/logger";
import { AppError } from "../../../errors/AppError";
import { HttpStatus } from "../../../constants/http-status";
import { HttpMessages } from "../../../constants/http-messages";
import { LoginDto } from "../dto/Login.dto";
import { UserDocument } from "../../users/models/User.model";
import { LoginResult } from "../types";
import { RegisterDto } from "../dto/Register.dto";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import { CompanyDocument } from "../../companies/models/Company.model";
import { Role } from "../../../constants/roles";
import AuthMapper from "../mapper/AuthMapper";
import { TokenType } from "../../../constants/token-type";
import { TokenExpiration } from "../../../constants/token-expiration";
import PasswordResetRepository from "../repositories/PasswordResetRepository";
import ResendProvider from "../../../providers/mail/ResendProvider";
import { resetPasswordTemplate } from "../../../providers/mail/templates/reset-password.template";
import { welcomeTemplate } from "../../../providers/mail/templates/welcome.template";
import { env } from "../../../config/env";

class AuthService {
  private readonly userRepository = UserRepository;
  private readonly passwordProvider = PasswordProvider;
  private readonly jwtProvider = JwtProvider;
  private readonly companyRepository = CompanyRepository;
  private readonly passwordResetRepository = PasswordResetRepository;
  private readonly resendProvider = ResendProvider;

  // ==========================================================
  // Métodos Públicos
  // ==========================================================

  public async register(dto: RegisterDto): Promise<LoginResult> {
    Logger.auth("Tentativa de registro.", {
      email: dto.email,
      company: dto.company.name,
    });

    this.validatePasswords(dto);

    await this.validateEmail(dto.email);

    await this.validateCompany(dto.company.name);

    const company = await this.createCompany(dto);

    const user = await this.createOwner(dto, company);

    await this.sendWelcomeEmail(user, company);

    return this.authenticate(user);
  }

  public async login(dto: LoginDto): Promise<LoginResult> {
    Logger.auth("Tentativa de login.", {
      email: dto.email,
    });

    const user = await this.findUserByEmail(dto.email);

    await this.validatePassword(dto.password, user.passwordHash, dto.email);

    this.validateUserStatus(user);

    return this.authenticate(user);
  }

  // ==========================================================
  // Fluxo de Autenticação
  // ==========================================================

  private async authenticate(user: UserDocument): Promise<LoginResult> {
    const tokens = this.generateTokens(user);

    await this.updateLoginInfo(user);

    return {
      user: AuthMapper.toAuthUser(user),
      tokens,
      mustChangePassword: user.mustChangePassword,
    };
  }

  private generateTokens(user: UserDocument): AuthTokens {
    const accessToken = this.jwtProvider.generateAccessToken({
      userId: user.id,
      companyId: user.companyId.toString(),
      role: user.role,
      type: TokenType.ACCESS,
    });

    const refreshToken = this.jwtProvider.generateRefreshToken({
      userId: user.id,
      companyId: user.companyId.toString(),
      role: user.role,
      type: TokenType.REFRESH,
    });

    return {
      accessToken,
      refreshToken,
    };
  }

  private async updateLoginInfo(user: UserDocument): Promise<void> {
    user.lastLogin = new Date();
    user.failedLoginAttempts = 0;
    user.lockUntil = null;

    Logger.auth(HttpMessages.LOGIN_UPDATED, {
      userId: user.id,
    });

    await user.save();
  }

  /**
   * ==========================================================
   * Renova o Access Token utilizando o Refresh Token.
   * ==========================================================
   */
  public async refresh(refreshToken: string): Promise<LoginResult> {
    Logger.auth("Tentativa de renovação do token.");

    const payload = this.jwtProvider.verifyRefreshToken(refreshToken);

    Logger.auth("Refresh token validado.", {
      userId: payload.userId,
    });

    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    Logger.auth("Usuário encontrado.", {
      userId: user.id,
    });

    this.validateUserStatus(user);

    return this.authenticate(user);
  }

  // ==========================================================
  // Validações
  // ==========================================================

  private async findUserByEmail(email: string) {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      Logger.security(HttpMessages.USER_NOT_FOUND, {
        email,
      });

      throw new AppError(
        HttpMessages.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    Logger.auth(HttpMessages.USER_FOUND, {
      email,
    });

    return user;
  }

  /**
   * ==========================================================
   * Valida a senha informada.
   *
   * A comparação é realizada utilizando bcrypt através
   * do PasswordProvider.
   *
   * Lança AppError caso a senha seja inválida.
   * ==========================================================
   */

  private async validatePassword(
    password: string,
    passwordHash: string,
    email: string,
  ): Promise<void> {
    const valid = await this.passwordProvider.compare(password, passwordHash);

    if (!valid) {
      Logger.security(HttpMessages.INVALID_CREDENTIALS, {
        email,
      });

      throw new AppError(
        HttpMessages.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED,
      );
    }

    Logger.auth(HttpMessages.PASSWORD_VALID, {
      email,
    });
  }

  /**
   * ==========================================================
   * Valida se o usuário pode acessar o sistema.
   *
   * Regras atuais:
   *
   * • Usuário ativo
   * • Conta não bloqueada
   *
   * Futuramente:
   *
   * • E-mail confirmado
   * • MFA habilitado
   * • Empresa ativa
   * ==========================================================
   */

  private validateUserStatus(user: UserDocument): void {
    if (!user.isActive) {
      throw new AppError(HttpMessages.USER_DISABLED, HttpStatus.FORBIDDEN);
    }

    const locked =
      user.lockUntil != null && user.lockUntil.getTime() > Date.now();

    if (locked) {
      throw new AppError(HttpMessages.USER_BLOCKED, HttpStatus.FORBIDDEN);
    }
  }

  /**
   * ==========================================================
   * Retorna os dados do usuário autenticado.
   *
   * Utilizado para validar o Access Token e obter
   * as informações básicas do usuário logado.
   * ==========================================================
   */
  public async me(userId: string) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      companyId: user.companyId.toString(),
      isActive: user.isActive,
    };
  }

  /**
   * ==========================================================
   * Valida se a senha e a confirmação são iguais.
   *
   * Esta validação é realizada antes de qualquer acesso ao
   * banco de dados para evitar operações desnecessárias.
   *
   * ==========================================================
   */
  private validatePasswords(dto: RegisterDto): void {
    if (dto.password !== dto.confirmPassword) {
      throw new AppError(
        HttpMessages.PASSWORDS_DO_NOT_MATCH,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * ==========================================================
   * Verifica se já existe um usuário cadastrado com o
   * e-mail informado.
   *
   * Lança AppError caso o e-mail já esteja em uso.
   * ==========================================================
   */
  private async validateEmail(email: string): Promise<void> {
    const exists = await this.userRepository.existsByEmail(email);

    if (exists) {
      throw new AppError(
        HttpMessages.EMAIL_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
      );
    }
  }

  /**
   * ==========================================================
   * Verifica se já existe uma empresa cadastrada com o
   * nome informado.
   *
   * Lança AppError caso a empresa já exista.
   * ==========================================================
   */
  private async validateCompany(name: string): Promise<void> {
    const company = await this.companyRepository.findByName(name);

    if (company) {
      throw new AppError(
        HttpMessages.COMPANY_ALREADY_EXISTS,
        HttpStatus.CONFLICT,
      );
    }
  }

  // ==========================================================
  // Criação
  // ==========================================================

  private async createCompany(dto: RegisterDto): Promise<CompanyDocument> {
    return this.companyRepository.create({
      name: dto.company.name,
    });
  }

  private async createOwner(
    dto: RegisterDto,
    company: CompanyDocument,
  ): Promise<UserDocument> {
    const passwordHash = await this.passwordProvider.hash(dto.password);

    return this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      companyId: company._id,
      role: Role.OWNER,
      mustChangePassword: false,
    });
  }

  /**
   * ==========================================================
   * Solicita a recuperação da palavra-passe.
   * ==========================================================
   */
  public async forgotPassword(email: string): Promise<void> {
    const user = await UserRepository.findByEmail(email);

    /**
     * Não revela se o utilizador existe.
     */
    if (!user) {
      return;
    }

    const token = JwtProvider.generateResetPasswordToken({
      userId: user._id.toString(),
      companyId: user.companyId.toString(),
      role: user.role,
      type: TokenType.RESET_PASSWORD,
    });

    await this.passwordResetRepository.create({
      userId: user._id.toString(),
      token,
      expiresAt: new Date(Date.now() + TokenExpiration.RESET_PASSWORD_TOKEN),
    });

    const resetUrl = `${env.frontend.FRONTEND_URL}/reset-password?token=${token}`;

    const html = resetPasswordTemplate({
      name: user.name,
      resetUrl,
    });

    await this.resendProvider.send({
      to: user.email,
      subject: "Recuperação de palavra-passe",
      html,
    });

    Logger.auth(`Token de recuperação enviado para ${user.email}`);
  }

  /**
   * ==========================================================
   * Redefine a palavra-passe do utilizador.
   * ==========================================================
   */
  public async resetPassword(token: string, password: string): Promise<void> {
    const resetToken = await this.passwordResetRepository.findByToken(token);

    if (!resetToken) {
      throw new AppError(HttpMessages.INVALID_TOKEN, HttpStatus.BAD_REQUEST);
    }

    if (resetToken.usedAt) {
      throw new AppError(HttpMessages.INVALID_TOKEN, HttpStatus.BAD_REQUEST);
    }

    if (resetToken.expiresAt < new Date()) {
      throw new AppError(HttpMessages.TOKEN_EXPIRED, HttpStatus.BAD_REQUEST);
    }

    const payload = this.jwtProvider.verifyResetPasswordToken(token);

    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    user.passwordHash = await this.passwordProvider.hash(password);

    user.passwordChangedAt = new Date();

    user.lastPasswordResetAt = new Date();

    user.mustChangePassword = false;

    await user.save();

    await this.passwordResetRepository.invalidate(token);

    Logger.auth(`Palavra-passe redefinida para o utilizador ${user.email}`);
  }

  /**
   * ==========================================================
   * Envia o e-mail de boas-vindas ao usuário.
   * ==========================================================
   */
  private async sendWelcomeEmail(
    user: UserDocument,
    company: CompanyDocument,
  ): Promise<void> {
    const loginUrl = `${env.frontend.FRONTEND_URL}/login`;

    const verificationToken = this.jwtProvider.generateEmailVerificationToken({
      userId: user.id,
      companyId: user.companyId.toString(),
      role: user.role,
      type: TokenType.EMAIL_VERIFICATION,
    });

    const verificationUrl = `${env.frontend.FRONTEND_URL}/verify-email?token=${verificationToken}`;

    const html = welcomeTemplate({
      name: user.name,
      companyName: company.name,
      loginUrl,
      verificationUrl,
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
  }

  /**
   * ==========================================================
   * Verifica o e-mail de um utilizador.
   * ==========================================================
   */
  public async verifyEmail(token: string): Promise<void> {
    const payload = this.jwtProvider.verifyEmailVerificationToken(token);

    if (payload.type !== TokenType.EMAIL_VERIFICATION) {
      throw new AppError(HttpMessages.INVALID_TOKEN, HttpStatus.UNAUTHORIZED);
    }

    const user = await this.userRepository.findById(payload.userId);

    if (!user) {
      throw new AppError(HttpMessages.USER_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    if (user.emailVerified) {
      return;
    }

    await this.userRepository.verifyEmail(payload.userId);
  }
}

export default new AuthService();
