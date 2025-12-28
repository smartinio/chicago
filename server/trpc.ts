import { initTRPC } from '@trpc/server'
import { logger } from '#game/logger'

// Avoid exporting the entire t-object since it's not very
// descriptive and can be confusing to newcomers used to t
// meaning translation in i18n libraries.
const t = initTRPC.create()

const shouldSkip = ({ path, type }: { path: string; type: string }) => {
  return ['keepAlive', 'snapshotSubscription', 'snapshotQuery'].includes(path)
}

const loggerMiddleware = t.middleware(async ({ path, type, next, input }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start

  if (shouldSkip({ path, type })) {
    // noop
  } else if (result.ok) {
    logger.log(`✅ ${type} ${path} (${duration}ms)`, { input, output: result.data })
  } else {
    logger.log(`❌ ${type} ${path} (${duration}ms)`, { input, error: result.error })
  }

  return result
})

// Base router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure.use(loggerMiddleware)
export const createContext = initTRPC.context
export const createCallerFactory = t.createCallerFactory
