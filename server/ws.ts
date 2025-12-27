import { applyWSSHandler } from '@trpc/server/adapters/ws'
import { Server } from 'http'
import ws from 'ws'
import { appRouter } from './routers/_app'
import { createContext } from './trpc'
import { logger } from 'game/logger'

export const createWSS = (
  server?: Server,
  wss = new ws.Server({
    server,
    path: '/ws',
  })
) => {
  const handler = applyWSSHandler({ wss, router: appRouter, createContext })

  wss.on('connection', (ws) => {
    logger.log(`➕➕ Connection (${wss.clients.size})`)
    ws.once('close', () => {
      logger.log(`➖➖ Connection (${wss.clients.size})`)
    })
  })

  process.on('SIGTERM', () => {
    logger.log('SIGTERM')
    handler.broadcastReconnectNotification()
    wss.close()
  })
}
