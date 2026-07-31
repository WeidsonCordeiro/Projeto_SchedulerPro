/**
 * ==========================================================
 * Arquivo: app.ts
 * ----------------------------------------------------------
 * Responsabilidade:
 *
 * Criar e configurar a aplicação Express.
 *
 * Este arquivo NÃO inicia o servidor.
 *
 * Apenas registra:
 *
 * ✔ Segurança
 * ✔ Middlewares
 * ✔ Rotas
 * ✔ Tratamento de erros
 *
 * ==========================================================
 */

import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morganMiddleware from "./config/morgan";
import cookieParser from "cookie-parser";
import router from "./routes";
import { requestIdMiddleware } from "./middlewares/request-id.middleware";
import { notFoundMiddleware } from "./middlewares/notFound.middleware";
import { errorMiddleware } from "./middlewares/error.middleware";

const app = express();

/**
 * Segurança HTTP
 */
app.use(helmet());

/**
 * Permite requisições de outros domínios.
 */
app.use(cors());

/**
 * Comprime respostas HTTP.
 */
app.use(compression());

/**
 * Converte JSON automaticamente.
 */
app.use(express.json());

/**
 * Cookies
 *
 * Utilizado para:
 *
 * • Access Token
 * • Refresh Token
 * • Sessões futuras
 */
app.use(cookieParser());

/**
 * Request ID
 */
app.use(requestIdMiddleware);

/**
 * Remove operadores maliciosos do MongoDB.
 */
//app.use(mongoSanitize());

/**
 * Logs HTTP
 */
app.use(morganMiddleware);

/**
 * Rotas da API.
 */
app.use("/api", router);

/**
 * Middleware de tratamento de erros.
 *
 * Deve ser SEMPRE o último middleware.
 */
app.use(notFoundMiddleware);

app.use(errorMiddleware);

export default app;
