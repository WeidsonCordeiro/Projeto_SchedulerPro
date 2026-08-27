/**
 * ==========================================================
 * Arquivo: permissions.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Definir todas as permissões do sistema.
 *
 * Roles representam QUEM é o usuário.
 *
 * Permissions representam O QUE o usuário pode fazer.
 *
 * ==========================================================
 */

export enum Permission {
  // usuários
  USER_CREATE = "USER_CREATE",
  USER_READ = "USER_READ",
  USER_UPDATE = "USER_UPDATE",
  USER_DELETE = "USER_DELETE",

  // empresa
  COMPANY_READ = "COMPANY_READ",
  COMPANY_UPDATE = "COMPANY_UPDATE",
  COMPANY_DELETE = "COMPANY_DELETE",
  COMPANY_ACTIVATE = "COMPANY_ACTIVATE",
  COMPANY_DEACTIVATE = "COMPANY_DEACTIVATE",

  // clientes
  CLIENT_CREATE = "CLIENT_CREATE",
  CLIENT_READ = "CLIENT_READ",
  CLIENT_UPDATE = "CLIENT_UPDATE",
  CLIENT_DELETE = "CLIENT_DELETE",

  // serviços
  SERVICE_CREATE = "SERVICE_CREATE",
  SERVICE_READ = "SERVICE_READ",
  SERVICE_UPDATE = "SERVICE_UPDATE",
  SERVICE_DELETE = "SERVICE_DELETE",

  // agenda
  APPOINTMENT_CREATE = "APPOINTMENT_CREATE",
  APPOINTMENT_READ = "APPOINTMENT_READ",
  APPOINTMENT_UPDATE = "APPOINTMENT_UPDATE",
  APPOINTMENT_DELETE = "APPOINTMENT_DELETE",

  //Disponibilidade
  AVAILABILITY_CREATE = "AVAILABILITY_CREATE",
  AVAILABILITY_READ = "AVAILABILITY_READ",
  AVAILABILITY_UPDATE = "AVAILABILITY_UPDATE",
  AVAILABILITY_DELETE = "AVAILABILITY_DELETE",
}
