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

class AuthService {
  private readonly userRepository = UserRepository;
  private readonly passwordProvider = PasswordProvider;
  private readonly jwtProvider = JwtProvider;
  private readonly companyRepository = CompanyRepository;

  // ==========================================================
  // Métodos Públicos
  // ==========================================================

  public async login(dto: LoginDto): Promise<LoginResult> {
    Logger.auth("Tentativa de login.", {
      email: dto.email,
    });

    const user = await this.findUserByEmail(dto.email);

    await this.validatePassword(dto.password, user.passwordHash, dto.email);

    this.validateUserStatus(user);

    return this.authenticate(user);
  }

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

    return this.authenticate(user);
  }

  public async refreshToken() {}

  public async logout() {}

  // ==========================================================
  // Fluxo de Autenticação
  // ==========================================================

  private async authenticate(user: UserDocument): Promise<LoginResult> {
    const tokens = this.generateTokens(user);

    await this.updateLoginInfo(user);

    return {
      user: AuthMapper.toAuthUser(user),
      tokens,
    };
  }

  private generateTokens(user: UserDocument): AuthTokens {
    const accessToken = this.jwtProvider.generateAccessToken({
      userId: user.id,
      companyId: user.companyId.toString(),
      role: user.role,
      type: "access",
    });

    const refreshToken = this.jwtProvider.generateRefreshToken({
      userId: user.id,
      companyId: user.companyId.toString(),
      role: user.role,
      type: "refresh",
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
        HttpStatus.UNAUTHORIZED
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
    email: string
  ): Promise<void> {
    const valid = await this.passwordProvider.compare(password, passwordHash);

    if (!valid) {
      Logger.security(HttpMessages.INVALID_CREDENTIALS, {
        email,
      });

      throw new AppError(
        HttpMessages.INVALID_CREDENTIALS,
        HttpStatus.UNAUTHORIZED
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
        HttpStatus.BAD_REQUEST
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
        HttpStatus.CONFLICT
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
        HttpStatus.CONFLICT
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
    company: CompanyDocument
  ): Promise<UserDocument> {
    const passwordHash = await this.passwordProvider.hash(dto.password);

    return this.userRepository.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      companyId: company._id,
      role: Role.OWNER,
    });
  }
}

export default new AuthService();
