import { last } from 'utils/last'
import { v4 as uuid } from 'uuid'
import { notifyKickedPlayer } from './emitter'
import { Game, Errors } from './types'

const dev = process.env.NODE_ENV === 'development'

const STALE_GAME_CHECK_FREQUENCY_MILLIS = 1 * 60 * 1000 // Every minute
const MAX_GAME_STALE_TIME_MILLIS = dev ? Infinity : 15 * 60 * 1000 // 15 minutes
const staleGameIntervalIds = new Map<string, NodeJS.Timer>()

export const games = new Map<string, Game>()

export const getGameAsAdmin = (params: { gameId: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  return { game }
}

export const getGameAsOutsider = (params: { gameId: string; password?: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  if (game && game.password !== params.password) {
    console.error(
      'Passwords dont match. Actual=',
      String(game.password),
      'Provided=',
      String(params.password)
    )
    return Errors.FORBIDDEN
  }

  return { game }
}

export const getGameAsCurrentPlayer = (params: { gameId: string; playerSecret: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  const player = game.round.currentPlayer

  if (player.secret !== params.playerSecret) {
    console.error('Player secret', params.playerSecret, 'is not bound to current player id:', player.id)
    return Errors.FORBIDDEN
  }

  return { game, player }
}

export const getGameAsOwner = (params: { gameId: string; ownerSecret: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  const { owner } = game

  if (owner.secret !== params.ownerSecret) {
    console.error('Player secret', params.ownerSecret, 'is not bound to owner id:', owner.id)
    return Errors.FORBIDDEN
  }

  return { game, owner }
}

export const getGameAsDealer = (params: { gameId: string; dealerSecret: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  const { dealer } = game

  if (dealer.secret !== params.dealerSecret) {
    console.error('Player secret', params.dealerSecret, 'is not bound to dealer id:', dealer.id)
    return Errors.FORBIDDEN
  }

  return { game, dealer }
}

export const getGameAsPlayer = (params: { gameId: string; playerSecret: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  const player = game.players.find((player) => player.secret === params.playerSecret)

  if (!player) {
    console.error('Player secret', params.playerSecret, 'is not bound to any player in game:', params.gameId)
    return Errors.FORBIDDEN
  }

  return { game, player }
}

export const storeGame = <T extends Omit<Game, 'id'>>(params: T) => {
  let id

  do {
    id = uuid().split('-')[0]
  } while (games.has(id))

  const game = {
    ...params,
    id,
  }

  games.set(game.id, game)

  createStaleChecker(game)

  return { game }
}

export const destroyGameAsOwner = (params: { gameId: string; ownerSecret: string }) => {
  const game = games.get(params.gameId)

  if (!game) {
    return Errors.GAME_NOT_FOUND
  }

  if (game && game.owner.secret !== params.ownerSecret) {
    console.error('Cannot destroy. Player secret', params.ownerSecret, 'is not bound to owner id:', game.owner.id)
    return Errors.FORBIDDEN
  }

  games.delete(params.gameId)
}

export const clearGames = () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('clearGames can only be used for testing')
  }

  games.clear()
}

const createStaleChecker = (game: Game) => {
  const gameCreatedMillis = Date.now()

  const interval = setInterval(() => {
    const lastEventMillis = last(game.events)?.timestamp || gameCreatedMillis
    const staleTimeMillis = Date.now() - lastEventMillis

    if (staleTimeMillis > MAX_GAME_STALE_TIME_MILLIS) {
      console.log('Stale game: Killing game', game.id, 'aka', game.name)

      clearInterval(interval)
      games.delete(game.id)
      staleGameIntervalIds.delete(game.id)

      for (const player of game.players) {
        console.log('Stale game: Kicking player', player.name)

        notifyKickedPlayer(player)
      }
    }
  }, STALE_GAME_CHECK_FREQUENCY_MILLIS)

  staleGameIntervalIds.set(game.id, interval)
}
