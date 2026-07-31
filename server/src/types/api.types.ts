/**
 * ==========================================================
 * Arquivo: api.types.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Centralizar os tipos utilizados nas respostas da API.
 *
 * Sempre que o Frontend consumir nossa API,
 * ele receberá respostas neste formato.
 *
 * ==========================================================
 */

export interface ValidationError {
  /**
   * Campo que apresentou erro.
   *
   * Exemplo:
   * email
   * password
   */
  field: string;

  /**
   * Mensagem amigável para o usuário.
   */
  message: string;
}

export interface ApiResponse<T = unknown> {
  /**
   * Indica se a operação foi executada com sucesso.
   */
  success: boolean;

  /**
   * Mensagem principal da resposta.
   */
  message: string;

  /**
   * Dados retornados pela API.
   */
  data?: T;

  /**
   * Lista de erros de validação.
   */
  errors?: ValidationError[];
}
