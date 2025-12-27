import { EventEmitter, on } from 'events'
import { createSnapshot, Snapshot } from 'game/snapshot'
import { Game, Player } from './types'

const ee = new EventEmitter()
ee.setMaxListeners(100) // Allow many concurrent subscriptions

export type SocketEvent = Snapshot | 'KICKED'

type PlayerChannel = string & { __brand: 'PlayerChannel' }

export const getPlayerChannel = (player: Player) => `${player.id}:${player.secret}` as PlayerChannel

export const emitter = {
  notify: (channel: PlayerChannel, snapshot: SocketEvent) => {
    ee.emit(channel, snapshot)
  },
  subscribe: (channel: PlayerChannel, handler: (snapshot: SocketEvent) => void) => {
    ee.on(channel, handler)
    return () => ee.off(channel, handler)
  },
  iterate: (channel: PlayerChannel, signal?: AbortSignal) => {
    return on(ee, channel, { signal }) as AsyncIterableIterator<[SocketEvent]>
  },
}

export const updateClients = (game: Game) => {
  for (const player of game.players) {
    const snapshot = createSnapshot({ player, game })
    const playerChannel = getPlayerChannel(player)
    emitter.notify(playerChannel, snapshot)
  }
}

export const notifyKickedPlayer = (player: Player) => {
  const playerChannel = getPlayerChannel(player)
  emitter.notify(playerChannel, 'KICKED')
}
