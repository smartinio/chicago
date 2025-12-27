import { Card, EventAction, Game, GamePhase, Player, RoundPhase, Suit, Trick } from './types'
import { last } from 'utils/last'

export type EventSnapshot = {
  actorId: 'server' | string
  action: EventAction
}

export type PlayerSnapshot = {
  id: string
  name: string
  score: number
  playedCards: Card[]
  takenChicago: boolean
}

export type Snapshot = {
  gameId: string
  playerId: string
  playerSecret: string
  currentPlayerId: string
  isMyTurn: boolean
  myCards: Card[]
  dealerId: string
  events: EventSnapshot[]
  gamePhase: GamePhase
  name: string
  ownerId: string
  password?: string
  players: PlayerSnapshot[]
  roundPhase: RoundPhase
  canStart: boolean
  startingCard?: Card
  rules: Game['rules']
  trickCount: number
  chicagoCallerId?: string
}

const createPlayerSnapshotList = (game: Game): PlayerSnapshot[] => {
  const players = Array.from(game.players)

  return players.map((player) => {
    return {
      id: player.id,
      name: player.name,
      score: player.score,
      playedCards: game.round.tricks.flatMap((trick) =>
        trick.playedCards.filter((p) => p.player.id === player.id).map((p) => p.card)
      ),
      takenChicago: player.takenChicago,
    }
  })
}

export const createSnapshot = (params: { player: Player; game: Game }): Snapshot => {
  const { player, game } = params

  const canStart =
    game.dealer.id === player.id &&
    ((game.phase === 'new' && game.players.length >= 2) ||
      game.round.phase === 'killed' ||
      game.round.phase === 'over')

  return {
    gameId: game.id,
    playerId: player.id,
    playerSecret: player.secret,
    startingCard: last(game.round.tricks)?.playedCards[0]?.card,
    currentPlayerId: game.currentPlayer.id,
    isMyTurn: game.currentPlayer.id === player.id,
    myCards: Array.from(player.cards),
    dealerId: game.dealer.id,
    events: game.events.map(
      (event): EventSnapshot => ({
        action: event.action,
        actorId: event.actor === 'server' ? 'server' : event.actor.id,
      })
    ),
    trickCount: game.round.tricks.length,
    gamePhase: game.phase,
    name: game.name,
    ownerId: game.owner.id,
    players: createPlayerSnapshotList(game),
    roundPhase: game.round.phase,
    password: game.password,
    canStart,
    rules: game.rules,
    chicagoCallerId: game.round.chicagoCaller?.id,
  }
}
