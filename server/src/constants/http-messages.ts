export const HttpMessages = {
  /*Operações*/
  SUCCESS: "Operação realizada com sucesso.",
  CREATED: "Registro criado com sucesso.",
  UPDATED: "Registro atualizado com sucesso.",
  DELETED: "Registro removido com sucesso.",
  NOT_FOUND: "Registro não encontrado.",
  VALIDATION_ERROR: "Erro de validação.",
  INTERNAL_ERROR: "Erro interno do servidor.",
  INVALID_TOKEN: "Token inválido.",
  INVALID_REFRESH_TOKEN: "Refresh Token inválido.",
  TOKEN_EXPIRED: "Token expirado.",
  UNAUTHORIZED: "Não autenticado.",
  INVALID_CREDENTIALS: "Email ou senha inválidos.",
  PASSWORD_CHANGE_REQUIRED: "É necessário alterar a senha antes de prosseguir.",

  /*Usuario*/
  USER_DISABLED: "Usuário desativado.",
  USER_NOT_UNAUTHORIZED: "Usuário não autorizado.",
  USER_NOT_PERMISSION: "Usuário não possui permissão para executar esta ação.",
  USER_NOT_PREVILEGES:
    "Usuário não possui privilégios para executar esta ação.",
  USER_BLOCKED: "Conta temporariamente bloqueada.",
  USER_CREATED: "Usuário criado com sucesso.",
  USER_FOUND: "Usuário encontrado.",
  USER_ACTIVATED: "Usuário ativado com sucesso.",
  USER_DEACTIVATED: "Usuário desativado com sucesso.",
  USER_UPDATED: "Usuário atualizado com sucesso.",
  USERS_FOUND: "Usuários encontrados.",
  USER_NOT_FOUND: "Usuário não encontrado.",
  USER_REMOVED: "Usuário removido com sucesso.",
  EMAIL_NOT_VERIFIED: "Confirme seu e-mail antes de acessar.",
  PASSWORD_VALID: "Senha válida.",
  PASSWORD_RESET_SUCCESS: "Senha redefinida com sucesso.",
  PASSWORD_RESET_FAILED: "Falha ao redefinir a senha.",
  LOGIN_UPDATED: "Último login atualizado.",
  LOGIN_FAILED: "Falha ao atualizar último login.",
  ACCOUNT_LOCKED:
    "Conta bloqueada devido a múltiplas tentativas de login falhadas.",
  PASSWORDS_DO_NOT_MATCH: "As senhas informadas não conferem.",
  EMAIL_ALREADY_EXISTS: "Já existe um usuário com este e-mail.",

  LOGOUT_SUCCESS: "Logout realizado com sucesso.",

  INVALID_USER: "Usuário inválido.",
  PASSWORD_CHANGED: "Senha alterada com sucesso.",
  PASSWORD_CHANGE_FAILED: "Falha ao alterar a senha.",
  PASSWORD_RESET_TOKEN_INVALID: "Token de redefinição de senha inválido.",
  PASSWORD_RESET_TOKEN_EXPIRED: "Token de redefinição de senha expirado.",

  /*Empresa*/
  COMPANY_FOUND: "Empresa encontrada.",
  COMPANIES_FOUND: "Empresas encontradas.",
  COMPANY_NOT_FOUND: "Empresa não encontrada.",
  COMPANY_CREATED: "Empresa criada com sucesso.",
  COMPANY_UPDATED: "Empresa atualizada com sucesso.",
  COMPANY_REMOVED: "Empresa removida com sucesso.",
  COMPANY_ACTIVATED: "Empresa ativada com sucesso.",
  COMPANY_DEACTIVATED: "Empresa desativada com sucesso.",
  COMPANY_ALREADY_EXISTS: "Já existe uma empresa com este nome.",
  COMPANY_INVALID: "Empresa inválida.",

  /*Serviço*/
  SERVICE_FOUND: "Serviço encontrado.",
  SERVICES_FOUND: "Serviços encontrados.",
  SERVICE_NOT_FOUND: "Serviço não encontrado.",
  SERVICE_CREATED: "Serviço criado com sucesso.",
  SERVICE_UPDATED: "Serviço atualizado com sucesso.",
  SERVICE_REMOVED: "Serviço removido com sucesso.",
  SERVICE_ACTIVATED: "Serviço ativado com sucesso.",
  SERVICE_DEACTIVATED: "Serviço desativado com sucesso.",

  /*Clientes*/
  CLIENT_CREATED: "Cliente criado com sucesso.",
  CLIENT_UPDATED: "Cliente atualizado com sucesso.",
  CLIENT_DELETED: "Cliente removido com sucesso.",
  CLIENT_FOUND: "Cliente encontrado.",
  CLIENTS_FOUND: "Clientes encontrados.",
  CLIENT_ACTIVATED: "Cliente ativado com sucesso.",
  CLIENT_DEACTIVATED: "Cliente desativado com sucesso.",
  CLIENT_NOT_FOUND: "Cliente não encontrado.",

  /*Agendamentos*/
  APPOINTMENT_CREATED: "Agendamento criado com sucesso.",
  APPOINTMENT_UPDATED: "Agendamento atualizado com sucesso.",
  APPOINTMENT_DELETED: "Agendamento removido com sucesso.",
  APPOINTMENT_FOUND: "Agendamento encontrado.",
  APPOINTMENTS_FOUND: "Agendamentos encontrados.",
  APPOINTMENT_NOT_FOUND: "Agendamento não encontrado.",
  EMPLOYEE_CONFLICT: "O funcionário já possui um agendamento neste horário.",
  CLIENT_CONFLICT: "O cliente já possui um agendamento neste horário.",
  APPOINTMENT_NO_SHOW: "Agendamento marcado como não comparecimento.",
  APPOINTMENT_CANCELLED: "Agendamento cancelado com sucesso.",
  APPOINTMENT_COMPLETED: "Agendamento concluído com sucesso.",
  APPOINTMENT_CONFIRMED: "Agendamento confirmado com sucesso.",
  STATUS_TRANSITION_NOT_ALLOWED:
    "Não é possível alterar o status deste agendamento.",
  STATUS_UPDATE_FAILED: "Não foi possível atualizar o status do agendamento.",

  /*Disponibilidade de funcionários*/
  AVAILABILITY_CREATED: "Disponibilidade do funcionário criada com sucesso.",
  AVAILABILITY_UPDATED:
    "Disponibilidade do funcionário atualizada com sucesso.",
  AVAILABILITY_DELETED: "Disponibilidade do funcionário removida com sucesso.",
  AVAILABILITY_FOUND: "Disponibilidade do funcionário encontrada.",
  AVAILABILITIES_FOUND: "Disponibilidades do funcionário encontradas.",
  AVAILABILITY_NOT_FOUND: "Disponibilidade do funcionário não encontrada.",

  EMPLOYEE_NOT_AVAILABLE: "O funcionário não está disponível neste horário.",
} as const;
