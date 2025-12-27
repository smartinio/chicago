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
  playedCard?: Card
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
}

const createPlayerSnapshotList = (game: Game): PlayerSnapshot[] => {
  const players = Array.from(game.players)

  return players.map((player) => {
    return {
      id: player.id,
      name: player.name,
      score: player.score,
      playedCard: last(game.round.tricks)?.playedCards.find((p) => p.player.id === player.id)?.card,
    }
  })
}

export const createSnapshot = (params: { player: Player; game: Game }): Snapshot => {
  const { player, game } = params

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
    gamePhase: game.phase,
    name: game.name,
    ownerId: game.owner.id,
    players: createPlayerSnapshotList(game),
    roundPhase: game.round.phase,
    password: game.password,
    canStart:
      game.dealer.id === player.id &&
      ((game.phase === 'new' && game.players.length >= 4) ||
        game.round.phase === 'killed' ||
        game.round.phase === 'over'),
  }
}
