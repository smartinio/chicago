import { dealCards } from 'game/dealCards'
import { Card, PlayedCard, Trick, Game, Player, Round, GameEvent, Results } from 'game/types'
import { createTrick, decideWinningPlayedCard, getPlayerNextTo } from 'game/utils'
import { destroyGameAsOwner } from './store'
import { last } from 'utils/last'

/**
 * Methods that mutate the game state are collected here
 * This makes it easier to spot which parts of the code mutate stuff
 * Useful when bug hunting or deciding whether to compute before or after state change
 */
export const mutate = {
  addEvent: (params: { game: Game; event: GameEvent }) => {
    params.game.events.push({ ...params.event, timestamp: Date.now() })
  },

  addPlayer: (params: { game: Game; player: Player }) => {
    params.game.players.push(params.player)
  },

  addTrick: (params: { game: Game }) => {
    const trick = createTrick({ playedCards: [] })
    params.game.round.tricks.push(trick)
    return trick
  },

  finishGame: (params: { game: Game }) => {
    params.game.phase = 'over'
  },

  endRound: (params: { game: Game }) => {
    const { game } = params

    game.round.phase = 'over'
    game.dealer = getPlayerNextTo(game.dealer, game)
    game.currentPlayer = getPlayerNextTo(game.dealer, game)
  },

  playCard: ({ trick, player, card }: PlayedCard & { trick: Trick }) => {
    trick.playedCards.push({ player, card })
    player.cards.delete(card)
  },

  givePoints: (params: { player: Player; points: number }) => {
    params.player.score += params.points
  },

  setTakenChicago: (params: { player: Player }) => {
    params.player.takenChicago = true
  },

  getNextThrowEligiblePlayerAfter: (params: { game: Game; afterPlayer: Player }) => {
    const { game, afterPlayer } = params

    let currentIdx = game.players.findIndex((p) => p.id === afterPlayer.id)

    for (let i = 1; i < game.players.length; i++) {
      const playerIndex = (currentIdx + i) % game.players.length
      const player = game.players[playerIndex]

      if (player.score < game.rules.throwScoreThreshold) {
        return player
      }

      mutate.markCycleIndex({ game, index: playerIndex })
    }
  },

  newRound: (params: { game: Game; round: Round }) => {
    const { game } = params

    game.phase = 'round'
    game.round = params.round
    game.deck = dealCards(game)
  },

  throwCards: (params: { game: Game; player: Player; cards: Card[] }) => {
    const { game, player, cards } = params
    cards.forEach((card) => player.cards.delete(card))
    game.deck.push(...cards) // add cards back to bottom of deck
    const newCards = game.deck.splice(0, cards.length)
    newCards.forEach((card) => player.cards.add(card))
  },

  updateThrowCycle: (params: { game: Game; player: Player }) => {
    const { game, player } = params
    const cycle = last(game.round.throwCycles)!
    const idx = game.players.findIndex((p) => p.id === player.id)
    cycle[idx] = true
    return cycle
  },

  addThrowCycle: (params: { game: Game }) => {
    const { game } = params
    const cycle = game.players.map(() => false)
    game.round.throwCycles.push(cycle)
    return cycle
  },

  markCycleIndex: (params: { game: Game; index: number }) => {
    const { game, index } = params
    const cycle = last(game.round.throwCycles)!
    cycle[index] = true
  },

  setChicagoCaller: (params: { game: Game; player: Player }) => {
    params.game.round.chicagoCaller = params.player
  },

  setCurrentPlayer: (params: { game: Game; player: Player }) => {
    params.game.currentPlayer = params.player
  },

  removePlayer: (params: { game: Game; player: Player }) => {
    const { game, player } = params

    if (game.players.length === 1) {
      const result = destroyGameAsOwner({ gameId: game.id, ownerSecret: player.secret })

      if (result) {
        return result
      }

      return Results.DESTROYED_GAME
    }

    const nextPlayer = getPlayerNextTo(player, game)

    if (game.dealer === player) {
      game.dealer = nextPlayer
    }

    if (game.owner === player) {
      game.owner = nextPlayer
    }

    if (game.currentPlayer === player) {
      game.currentPlayer = nextPlayer
    }

    game.players = game.players.filter((p) => p.id !== player.id)
  },

  resetGame: (params: { game: Game }) => {
    params.game.events = []

    for (const player of params.game.players) {
      player.cards.clear()
      player.score = 0
    }
  },

  setRoundPhase: (params: { game: Game; phase: Round['phase'] }) => {
    params.game.round.phase = params.phase
  },
}
