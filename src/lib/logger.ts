import { logger as liteLogger } from '@lark-apaas/client-toolkit-lite';
/**
 * 轻量日志工具
 * 统一日志输出格式
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

function format(level: LogLevel, args: unknown[]): string {
  const ts = new Date().toISOString();
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  return `[${ts}] [${level}] ${msg}`;
}

export const logger = {
  info(...args: unknown[]): void {
    liteLogger.info(format('info', args));
  },
  warn(...args: unknown[]): void {
    liteLogger.warn(format('warn', args));
  },
  error(...args: unknown[]): void {
    liteLogger.error(format('error', args));
  },
  debug(...args: unknown[]): void {
    // lite logger 可能无 debug 方法，开发环境降级为 info
    liteLogger.info(format('debug', args));
  },
};
