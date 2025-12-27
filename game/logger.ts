const consoleLogger = {
  log: (...args: any[]) => {
    console.log(...args)
  },
  info: (...args: any[]) => {
    console.log(...args)
  },
  error: (...args: any[]) => {
    console.error(...args)
  },
  warn: (...args: any[]) => {
    console.warn(...args)
  },
  debug: (...args: any[]) => {
    console.debug(...args)
  },
  trace: (...args: any[]) => {
    console.trace(...args)
  },
}

const noopLogger = {
  log: (...args: any[]) => {},
  info: (...args: any[]) => {},
  error: (...args: any[]) => {},
  warn: (...args: any[]) => {},
  debug: (...args: any[]) => {},
  trace: (...args: any[]) => {},
}

export const logger = process.env.NODE_ENV === 'test' ? noopLogger : consoleLogger
