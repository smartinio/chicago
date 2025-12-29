// Mock tRPC for Storybook - provides stubs that don't crash
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../server/routers/_app'

export const trpc = createTRPCReact<AppRouter>()

