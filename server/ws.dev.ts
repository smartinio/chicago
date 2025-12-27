import ws from 'ws'
import { createWSS } from './ws'
import { WS_PORT } from 'shared/constants'

const wss = new ws.Server({
  path: '/ws',
  port: WS_PORT,
})

createWSS(undefined, wss)
