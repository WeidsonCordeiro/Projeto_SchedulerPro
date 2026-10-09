/**
 * ==========================================================
 * Arquivo: ClientInviteService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio do convite de conta
 * CLIENT: criação, consulta pública e aceite.
 *
 * Regras centrais:
 *
 * • o token é gerado, enviado por e-mail e nunca persistido
 *   em plaintext (apenas SHA-256);
 * • o convite é de uso único, com expiração, e os pendentes
 *   de um cliente são revogados quando um novo é emitido;
 * • `companyId`, `clientId` e `role` nunca vêm do frontend:
 *   derivam do convite e do registo confiável do `Client`;
 * • o simples conhecimento do e-mail NUNCA associa contas —
 *   a associação só acontece pelo token do convite;
 * • o token nunca aparece em logs (apenas o hint do hash).
 * ==========================================================
 */

import { Types } from "mongoose";

import ClientInviteRepository from "../repositories/ClientInviteRepository";
import ClientRepository from "../../Clients/repositories/ClientRepository";
import UserRepository from "../../users/repositories/UserRepository";
import CompanyRepository from "../../companies/repositories/CompanyRepository";
import PasswordProvider from "../../../providers/security/PasswordProvider";
import ClientInviteTokenProvider from "../../../providers/security/ClientInviteTokenProvider";
import NotificationDispatcher from "../../notifications/services/NotificationDispatcher";
import Logger from "../../../providers/logger";

import { buildClientInviteUrl } from "../../../utils/client-invite-url";
import { Role } from "../../../constants/roles";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { AcceptClientInviteDto } from "../dto/AcceptClientInvite.dto";
import { ClientDocument } from "../../Clients/models/Client.model";

/**
 * Validade do convite: 7 dias — tempo típico para um cliente
 * abrir o link recebido sem que a credencial fique
 * indefinidamente viva.
 */
export const CLIENT_INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Verificação leve de formato do e-mail armazenado no Client.
 *
 * O e-mail do Client pode ter sido criado pelo agendamento
 * público sem passar por validação de e-mail; um convite
 * enviado para um endereço malformado seria um convite morto.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ResolvedInvite {
  invite: {
    _id: Types.ObjectId;
    companyId: Types.ObjectId;
    clientId: Types.ObjectId;
    expiresAt: Date;
  };
  client: ClientDocument;
  email: string;
}

class ClientInviteService {
  private readonly inviteRepository = ClientInviteRepository;
  private readonly clientRepository = ClientRepository;
  private readonly userRepository = UserRepository;
  private readonly companyRepository = CompanyRepository;
  private readonly passwordProvider = PasswordProvider;
  private readonly tokenProvider = ClientInviteTokenProvider;
  private readonly notificationDispatcher = NotificationDispatcher;
  private readonly logger = Logger;

  /**
   * ==========================================================
   * Invalida um convite sem distinguir as causas externas.
   *
   * Malformado, inexistente, revogado ou consumido respondem
   * EXATAMENTE o mesmo: um tentador não pode usar o oracle de
   * respostas para descobrir se um token existe.
   * ==========================================================
   */
  private invalidInvite(): AppError {
    return new AppError(HttpMessages.CLIENT_INVITE_INVALID, HttpStatus.NOT_FOUND);
  }

  /**
   * ==========================================================
   * Resolve um token de convite no seu estado atual.
   *
   * Usado pela consulta e pelo aceite — os dois caminhos
   * públicos partilham as mesmas barreiras:
   *
   * 1. formato do token (sem tocar na base de dados);
   * 2. hash → convite pendente e não expirado;
   * 3. `Client` continua a existir, na mesma empresa do
   *    convite e não soft-deleted;
   * 4. o Client continua sem conta associada (Cenário B);
   * 5. o e-mail do Client não pertence a outra conta (Cenário
   *    C) — o e-mail nunca é prova de identidade.
   * ==========================================================
   */
  private async resolveInvite(token: string | undefined): Promise<ResolvedInvite> {
    if (!this.tokenProvider.hasValidFormat(token)) {
      throw this.invalidInvite();
    }

    const tokenHash = this.tokenProvider.hash(token);
    const invite = await this.inviteRepository.findByTokenHash(tokenHash);

    if (!invite) {
      throw this.invalidInvite();
    }

    if (invite.revokedAt != null || invite.usedAt != null) {
      throw this.invalidInvite();
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new AppError(
        HttpMessages.CLIENT_INVITE_EXPIRED,
        HttpStatus.NOT_FOUND,
      );
    }

    const client = await this.clientRepository.findByIdAndCompany(
      invite.clientId.toString(),
      invite.companyId.toString(),
    );

    if (!client) {
      throw this.invalidInvite();
    }

    if (client.companyId.toString() !== invite.companyId.toString()) {
      throw this.invalidInvite();
    }

    const email = client.email?.trim().toLowerCase() ?? "";

    if (!email || !EMAIL_PATTERN.test(email)) {
      throw this.invalidInvite();
    }

    /**
     * Cenário B: o cliente já ganhou conta entretanto (ex.:
     * "Dar acesso" usado em paralelo). Nada a aceitar.
     */
    const linkedUser = await this.userRepository.findByClientIdIncludingDeleted(
      client._id.toString(),
      invite.companyId.toString(),
    );

    if (linkedUser) {
      throw new AppError(
        HttpMessages.CLIENT_ALREADY_HAS_ACCOUNT,
        HttpStatus.CONFLICT,
      );
    }

    /**
     * Cenário C: o e-mail pertence a uma CONTA existente de
     * outro Client (ou a uma conta interna). Associar por aqui
     * seria takeover por e-mail — proibido. A verificação é
     * global porque o índice unique de email do User é global.
     */
    const emailOwner = await this.userRepository.findByEmailIncludingDeleted(email);

    if (emailOwner && emailOwner.clientId?.toString() !== client._id.toString()) {
      throw new AppError(HttpMessages.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    return { invite, client, email };
  }

  /**
   * ==========================================================
   * Emite um convite para um Client da empresa autenticada.
   *
   * Barreiras, pela ordem:
   *
   * 1. o Client existe, não está soft-deleted e pertence à
   *    empresa do utilizador autenticado (tenant);
   * 2. tem e-mail válido;
   * 3. ainda não possui conta CLIENT (Cenário B → 409, sem
   *    novo User e sem convite);
   * 4. o e-mail não pertence a outra conta (Cenário C → 409,
   *    sem associação silenciosa).
   *
   * O token é gerado, cifrado apenas em hash e enviado por
   * e-mail; NUNCA é devolvido na resposta nem registado.
   *
   * Se o envio falhar, o convite emitido é revogado — um
   * convite que ninguém recebeu não pode ficar vivo à espera
   * de um link que não existe.
   * ==========================================================
   */
  public async createInvite(
    clientId: string,
    companyId: string,
    actorUserId: string,
  ) {
    const client = await this.clientRepository.findByIdAndCompany(
      clientId,
      companyId,
    );

    if (!client) {
      throw new AppError(HttpMessages.CLIENT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const email = client.email?.trim().toLowerCase() ?? "";

    if (!email) {
      throw new AppError(
        HttpMessages.CLIENT_EMAIL_REQUIRED,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (!EMAIL_PATTERN.test(email)) {
      throw new AppError(HttpMessages.CLIENT_EMAIL_INVALID, HttpStatus.BAD_REQUEST);
    }

    const linkedUser = await this.userRepository.findByClientIdIncludingDeleted(
      client._id.toString(),
      companyId,
    );

    if (linkedUser) {
      throw new AppError(
        HttpMessages.CLIENT_ALREADY_HAS_ACCOUNT,
        HttpStatus.CONFLICT,
      );
    }

    const emailOwner = await this.userRepository.findByEmailIncludingDeleted(email);

    if (emailOwner && emailOwner.clientId?.toString() !== client._id.toString()) {
      throw new AppError(HttpMessages.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT);
    }

    const company = await this.companyRepository.findById(companyId);
    const companyName = company?.name ?? "SchedulerPro";

    /**
     * Convites anteriores do mesmo cliente deixam de valer:
     * no máximo um link utilizável por cliente.
     */
    await this.inviteRepository.revokePendingForClient(client._id.toString());

    const token = this.tokenProvider.generate();
    const tokenHash = this.tokenProvider.hash(token);

    await this.inviteRepository.create({
      tokenHash,
      companyId: client.companyId,
      clientId: client._id,
      expiresAt: new Date(Date.now() + CLIENT_INVITE_TTL_MS),
      createdBy: new Types.ObjectId(actorUserId),
    });

    try {
      await this.notificationDispatcher.dispatchClientInviteEmail({
        to: email,
        clientName: client.name,
        companyName,
        inviteUrl: buildClientInviteUrl(token),
      });
    } catch (error) {
      /**
       * Envio falhou: revoga o convite recém-criado para não
       * deixar uma credencial viva que ninguém recebeu.
       */
      await this.inviteRepository.revokePendingForClient(client._id.toString());

      this.logger.error("Falha ao enviar convite de conta CLIENT", {
        clientId: client._id.toString(),
        companyId,
        error: error instanceof Error ? error.message : String(error),
      });

      throw new AppError(HttpMessages.EMAIL_SEND_FAILED, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    /**
     * Registo operacional SEM token, sem hash e sem URL — o
     * link só existe na mensagem de e-mail.
     */
    this.logger.info("Convite de conta CLIENT emitido", {
      clientId: client._id.toString(),
      companyId,
      invitedBy: actorUserId,
    });

    return {
      expiresAt: new Date(Date.now() + CLIENT_INVITE_TTL_MS),
    };
  }

  /**
   * ==========================================================
   * Consulta pública do convite (estado "válido").
   *
   * Devolve apenas o que a página de aceite precisa de
   * exibir: nome do cliente, nome da empresa, e-mail que será
   * usado e validade. Nada de ids internos, hashes ou dados
   * administrativos.
   * ==========================================================
   */
  public async inspect(token: string | undefined) {
    const { invite, client, email } = await this.resolveInvite(token);

    const company = await this.companyRepository.findById(
      invite.companyId.toString(),
    );

    return {
      clientName: client.name,
      companyName: company?.name ?? "SchedulerPro",
      email,
      expiresAt: invite.expiresAt,
    };
  }

  /**
   * ==========================================================
   * Aceite do convite: cria a conta CLIENT e associa-a ao
   * Client correto.
   *
   * Sequência:
   *
   * 1. `resolveInvite` (todas as barreiras acima);
   * 2. consumo ATÓMICO do convite — duas tentativas
   *    concorrentes nunca passam ambas;
   * 3. hash da senha (bcrypt) e criação do `User` com role
   *    CLIENT, `clientId` do Client resolvido e `companyId`
   *    DERIVADO do Client/convite — nunca do pedido;
   * 4. em falha de criação, o convite é devolvido ao estado
   *    pendente para não deixar o cliente sem conta e sem
   *    link.
   *
   * `role`, `companyId` e `clientId` do corpo do pedido são
   * impossíveis de influenciar: o validator rejeita campos
   * fora da lista branca e estes valores nem são lidos.
   * ==========================================================
   */
  public async accept(token: string | undefined, dto: AcceptClientInviteDto) {
    const { invite, client, email } = await this.resolveInvite(token);

    const claimed = await this.inviteRepository.claim(invite._id);

    if (!claimed) {
      /**
       * Outro pedido consumiu o convite entre a resolução e o
       * consumo — uso único mantido.
       */
      throw this.invalidInvite();
    }

    const usedAt = claimed.usedAt ?? new Date();

    try {
      const passwordHash = await this.passwordProvider.hash(dto.password);

      const user = await this.userRepository.create({
        name: client.name,
        email,
        passwordHash,
        companyId: client.companyId,
        role: Role.CLIENT,
        clientId: client._id,
        /**
         * A senha foi escolhida pelo próprio cliente no
         * aceite: não há primeiro login forçado a trocá-la.
         */
        mustChangePassword: false,
        isActive: true,
        emailVerified: true,
      });

      this.logger.info("Conta CLIENT criada via convite", {
        clientId: client._id.toString(),
        companyId: client.companyId.toString(),
        userId: user._id.toString(),
      });

      return { email };
    } catch (error) {
      await this.inviteRepository.release(invite._id, usedAt);

      /**
       * Corrida pelo índice unique de email: outra conta
       * criada com o mesmo endereço entre a verificação e a
       * escrita.
       */
      const mongoCode =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: unknown }).code
          : undefined;

      if (mongoCode === 11000) {
        throw new AppError(HttpMessages.EMAIL_ALREADY_EXISTS, HttpStatus.CONFLICT);
      }

      throw error;
    }
  }
}

export default new ClientInviteService();
