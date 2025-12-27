import { initTRPC } from '@trpc/server'

// Avoid exporting the entire t-object since it's not very
// descriptive and can be confusing to newcomers used to t
// meaning translation in i18n libraries.
const t = initTRPC.create()

const loggerMiddleware = t.middleware(async ({ path, type, next, input }) => {
  const start = Date.now()
  const result = await next()
  const duration = Date.now() - start

  if (result.ok) {
    console.log(`✅ ${type} ${path} (${duration}ms)`, { input, output: result.data })
  } else {
    console.log(`❌ ${type} ${path} (${duration}ms)`, { input, error: result.error })
  }

  return result
})

// Base router and procedure helpers
export const router = t.router
export const publicProcedure = t.procedure.use(loggerMiddleware)
export const createContext = initTRPC.context
export const createCallerFactory = t.createCallerFactory
