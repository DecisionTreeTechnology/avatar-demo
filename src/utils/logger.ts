/**
 * Production-safe logging utility
 * Logs are disabled in production build, but available for debugging in development
 */

const isDevelopment = import.meta.env.MODE === 'development' || import.meta.env.DEV;

interface Logger {
  log: (message: string, ...args: any[]) => void;
  warn: (message: string, ...args: any[]) => void;
  error: (message: string, ...args: any[]) => void;
  debug: (message: string, ...args: any[]) => void;
}

const createLogger = (prefix: string): Logger => {
  const formatMessage = (message: string) => 
    `[${prefix}] ${message}`;

  return {
    log: (message: string, ...args: any[]) => {
      if (isDevelopment) {
        console.log(formatMessage(message), ...args);
      }
    },
    warn: (message: string, ...args: any[]) => {
      if (isDevelopment) {
        console.warn(formatMessage(message), ...args);
      }
    },
    error: (message: string, ...args: any[]) => {
      // Always log errors, even in production
      console.error(formatMessage(message), ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (isDevelopment) {
        console.debug(formatMessage(message), ...args);
      }
    }
  };
};

export { createLogger, isDevelopment };