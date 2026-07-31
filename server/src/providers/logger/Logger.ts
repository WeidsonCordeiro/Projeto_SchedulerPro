import { logger } from "../../config/logger";
import { LogMeta } from "./types";
import { LogCategory } from "./categories";
import { formatCategory } from "./formatter";

class Logger {
  public http(message: string, meta?: LogMeta): void {
    logger.http(message, meta);
  }

  public info(message: string, meta?: LogMeta): void {
    logger.info(message, meta);
  }

  public warn(message: string, meta?: LogMeta): void {
    logger.warn(message, meta);
  }

  public debug(message: string, meta?: LogMeta): void {
    logger.debug(message, meta);
  }

  public success(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.SYSTEM, message), meta);
  }

  public auth(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.AUTH, message), meta);
  }

  public database(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.DATABASE, message), meta);
  }

  public upload(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.UPLOAD, message), meta);
  }

  public email(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.EMAIL, message), meta);
  }

  public redis(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.REDIS, message), meta);
  }

  public security(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.SECURITY, message), meta);
  }

  public system(message: string, meta?: LogMeta): void {
    logger.info(formatCategory(LogCategory.SYSTEM, message), meta);
  }

  public error(error: Error | string, meta?: LogMeta): void {
    if (error instanceof Error) {
      logger.error(formatCategory(LogCategory.SYSTEM, error.message), {
        ...meta,
        stack: error.stack,
        name: error.name,
        timestamp: new Date().toISOString(),
      });

      return;
    }

    logger.error(error, meta);
  }
}

export default new Logger();
