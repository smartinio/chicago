import { Card, EventAction, Game, GamePhase, HandType, Player, RoundPhase } from './types'
import { last } from '#utils/last'

export type EventSnapshot = {
  id: string
  actorId: 'server' | string
  action: EventAction
  data: Partial<{
    accepted: boolean
    answer: 'points' | 'reset_others'
    count: number
    handType: HandType
    points: number
    startingCard: Card
    player: PlayerSnapshot
    card: Card
    cards: Card[]
    throwNumber: number
    maxThrows: number
  }>
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
  roundWinnerId?: string
  openCard?: Card
  oneOpenAvailable: boolean
}

const createPlayerSnapshotList = (game: Game): PlayerSnapshot[] => {
  const players = Array.from(game.players)

  return players.map((player) => createPlayerSnapshot(player, game))
}

const createPlayerSnapshot = (player: Player, game: Game): PlayerSnapshot => {
  return {
    id: player.id,
    name: player.name,
    score: player.score,
    playedCards: game.round.tricks.flatMap((trick) =>
      trick.playedCards.filter((p) => p.player.id === player.id).map((p) => p.card)
    ),
    takenChicago: player.takenChicago,
  }
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
    events: game.events.slice(-20).map(
      (event): EventSnapshot => ({
        id: event.id,
        action: event.action,
        actorId: event.actor === 'server' ? 'server' : event.actor.id,
        data: {
          accepted: event.accepted,
          answer: event.answer,
          count: event.count,
          handType: event.handType,
          points: event.points,
          startingCard: event.startingCard,
          player: event.player ? createPlayerSnapshot(event.player, game) : undefined,
          card: event.card,
          cards: event.cards,
          throwNumber: event.throwNumber,
          maxThrows: event.maxThrows,
        },
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
    roundWinnerId: game.round.winner?.id,
    openCard: game.round.openCard,
    oneOpenAvailable:
      game.rules.oneOpenMode === 'all' ||
      game.round.throwCycles.length === game.rules.numberOfThrows,
  }
}
