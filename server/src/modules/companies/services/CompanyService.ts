/**
 * ==========================================================
 * Arquivo: CompanyService.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Implementar as regras de negócio relacionadas
 * às empresas.
 *
 * ==========================================================
 */

import CompanyMapper from "../mappers/CompanyMapper";
import CompanyRepository from "../repositories/CompanyRepository";
import { AppError } from "../../../errors/AppError";
import { HttpMessages } from "../../../constants/http-messages";
import { HttpStatus } from "../../../constants/http-status";
import { UpdateCompanyDto } from "../dto/UpdateCompany.dto";
import { isValidIanaTimezone } from "../../../utils/timezone";
import { Types } from "mongoose";
import { CompanyDocument } from "../models/Company.model";
import imageProvider from "../../../providers/images/CloudinaryImageProvider";
import Logger from "../../../providers/logger";
import {
  ImageEntity,
  type StoredImage,
  type UploadedFile,
} from "../../../providers/images/types";

class CompanyService {
  private readonly imageProvider = imageProvider;

  private ensureValidId(id: string): void {
    if (!Types.ObjectId.isValid(id)) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }

  private ensureTenant(id: string, companyId: string): void {
    this.ensureValidId(id);
    if (id !== companyId) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
  }
  /**
   * ==========================================================
   * Procura uma empresa pelo ID.
   * ==========================================================
   */
  public async findById(id: string, companyId: string) {
    this.ensureTenant(id, companyId);
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return CompanyMapper.toResponse(company);
  }

  /**
   * ==========================================================
   * Procura todas as empresas.
   * ==========================================================
   */
  public async findAll(companyId: string) {
    const companies = await CompanyRepository.findAll(companyId);

    return CompanyMapper.toResponseList(companies);
  }

  /**
   * ==========================================================
   * Cria uma empresa.
   * ==========================================================
   */
  public async create() {}

  /**
   * ==========================================================
   * Atualiza uma empresa.
   * ==========================================================
   */
  public async update(id: string, data: UpdateCompanyDto, companyId: string) {
    this.ensureTenant(id, companyId);
    if (data.timezone !== undefined && !isValidIanaTimezone(data.timezone)) {
      throw new AppError(HttpMessages.TIMEZONE_INVALID, HttpStatus.BAD_REQUEST);
    }
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updateData: UpdateCompanyDto = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.timezone !== undefined) updateData.timezone = data.timezone;

    const updatedCompany = await CompanyRepository.update(id, updateData);

    return CompanyMapper.toResponse(updatedCompany!);
  }

  /**
   * ==========================================================
   * Localiza uma empresa para uma operação de logo.
   *
   * Aplica, pela ordem, as barreiras:
   *
   * 1. existe e não está soft-deleted (o repository filtra por
   *    `deletedAt: null`);
   * 2. é a própria empresa do utilizador autenticado (tenant —
   *    a empresa é identificada pelo próprio `_id`, e o
   *    `companyId` do token tem de ser igual a esse `_id`).
   *
   * Segue o padrão de tenant do módulo Company: ninguém de
   * outra empresa pode operar sobre uma empresa cujo `_id` não
   * seja o do próprio token; o erro é 404 (mesma semântica do
   * `findById`/`update` existentes).
   * ==========================================================
   */
  private async findCompanyForLogo(
    id: string,
    companyId: string,
  ): Promise<CompanyDocument> {
    this.ensureTenant(id, companyId);

    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    return company;
  }

  /**
   * ==========================================================
   * Envia ou substitui a logo de uma empresa.
   *
   * Delega a substituição ao `imageProvider.replace()`, que
   * valida o ficheiro novo ANTES de destruir o anterior e
   * trata a primeira logo (quando `previous` é null).
   *
   * Não existe sequência manual remove+upload aqui: isso
   * duplicaria a lógica do provider.
   * ==========================================================
   */
  public async updateLogo(id: string, file: UploadedFile, companyId: string) {
    const company = await this.findCompanyForLogo(id, companyId);

    const logo = await this.imageProvider.replace({
      file,
      entity: ImageEntity.COMPANY,
      previous: company.logo ?? null,
    });

    const updatedCompany = await CompanyRepository.updateLogo(id, logo);

    if (!updatedCompany) {
      /**
       * A imagem já foi enviada para o storage mas não foi
       * possível associá-la ao registo. O `publicId` fica
       * registado no log para não se tornar um órfão
       * silencioso.
       */
      Logger.error("Logo enviado mas empresa não foi atualizada", {
        id,
        companyId,
        orphanPublicId: logo.publicId,
      });

      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    Logger.upload(`Logo da empresa ${id} atualizada`, {
      id,
      companyId,
      publicId: logo.publicId,
    });

    return CompanyMapper.toResponse(updatedCompany);
  }

  /**
   * ==========================================================
   * Remove a logo de uma empresa.
   *
   * Idempotente: uma empresa sem logo é um estado válido,
   * devolve a empresa e não chama o storage. Nunca se limita
   * a apagar o campo no MongoDB deixando o recurso no
   * Cloudinary.
   * ==========================================================
   */
  public async removeLogo(id: string, companyId: string) {
    const company = await this.findCompanyForLogo(id, companyId);

    if (!company.logo) {
      Logger.info(`Empresa ${id} não possui logo para remover`, {
        id,
        companyId,
      });

      return CompanyMapper.toResponse(company);
    }

    const image: StoredImage = company.logo;

    await this.imageProvider.remove({ image });

    const updatedCompany = await CompanyRepository.updateLogo(id, null);

    if (!updatedCompany) {
      /**
       * A imagem já saiu do storage, mas o campo do MongoDB
       * continua a apontar para ela. Sem este log, a
       * referência ficaria quebrada sem rasto.
       */
      Logger.error("Logo removido mas empresa não foi atualizada", {
        id,
        companyId,
        stalePublicId: image.publicId,
      });

      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    Logger.upload(`Logo da empresa ${id} removida`, {
      id,
      companyId,
      publicId: image.publicId,
    });

    return CompanyMapper.toResponse(updatedCompany);
  }

  /**
   * ==========================================================
   * Remove uma empresa.
   * ==========================================================
   */
  public async delete(id: string, companyId: string): Promise<void> {
    this.ensureTenant(id, companyId);
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    await CompanyRepository.softDelete(id);
  }

  /**
   * ==========================================================
   * Ativa uma empresa.
   * ==========================================================
   */
  public async activate(id: string, companyId: string) {
    this.ensureTenant(id, companyId);
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updatedCompany = await CompanyRepository.activate(id);

    return CompanyMapper.toResponse(updatedCompany!);
  }

  /**
   * ==========================================================
   * Desativa uma empresa.
   * ==========================================================
   */
  public async deactivate(id: string, companyId: string) {
    this.ensureTenant(id, companyId);
    const company = await CompanyRepository.findById(id);

    if (!company) {
      throw new AppError(HttpMessages.COMPANY_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const updatedCompany = await CompanyRepository.deactivate(id);

    return CompanyMapper.toResponse(updatedCompany!);
  }
}

export default new CompanyService();
