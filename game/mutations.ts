import { dealCards } from '#game/dealCards'
import { Card, PlayedCard, Trick, Game, Player, Round, GameEvent, Results } from '#game/types'
import { createTrick, decideWinningPlayedCard, getPlayerNextTo } from '#game/utils'
import { destroyGameAsOwner } from './store'
import { last } from '#utils/last'

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

  endRound: (params: { game: Game; roundWinner: Player }) => {
    const { game } = params

    game.round.phase = 'over'
    game.round.winner = params.roundWinner
    game.dealer = getPlayerNextTo(game.dealer, game)
    game.currentPlayer = getPlayerNextTo(game.dealer, game)

    // Check for winner: must have 52+ points AND have taken Chicago at least once
    const gameWinner = game.players.some((p) => p.score >= 52 && p.takenChicago)

    if (gameWinner) {
      mutate.finishGame({ game })
    }
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

      mutate.maybeMarkCycleIndex({ game, index: playerIndex })
    }
  },

  newRound: (params: { game: Game; round: Round }) => {
    const { game } = params

    game.phase = 'round'
    game.round = params.round
    game.deck = dealCards(game)
  },

  exchangeCards: (params: { game: Game; player: Player; cards: Card[] }) => {
    const { game, player, cards } = params
    cards.forEach((card) => player.cards.delete(card))
    game.deck.push(...cards) // add cards back to bottom of deck
    const newCards = game.deck.splice(0, cards.length)
    newCards.forEach((card) => player.cards.add(card))
  },

  drawCards: (params: { game: Game; count: number }) => {
    const { game, count } = params
    const cards = game.deck.splice(0, count)
    return cards
  },

  acceptCards: (params: { player: Player; cards: Card[] }) => {
    const { player, cards } = params
    cards.forEach((card) => player.cards.add(card))
  },

  removeCards: (params: { player: Player; cards: Card[] }) => {
    const { player, cards } = params
    cards.forEach((card) => player.cards.delete(card))
  },

  returnCards: (params: { game: Game; cards: Card[] }) => {
    const { game, cards } = params
    game.deck.push(...cards)
  },

  resetOthersScore: (params: { game: Game; player: Player }) => {
    const { game, player } = params
    for (const p of game.players) {
      if (p.id !== player.id) {
        p.score = 0
      }
    }
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

  maybeMarkCycleIndex: (params: { game: Game; index: number }) => {
    const { game, index } = params
    const cycle = last(game.round.throwCycles)
    if (cycle) {
      cycle[index] = true
    }
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
      player.takenChicago = false
    }
  },

  setRoundPhase: (params: { game: Game; phase: Round['phase'] }) => {
    params.game.round.phase = params.phase
  },

  setOpenCard: (params: { game: Game; card: Card | undefined }) => {
    params.game.round.openCard = params.card
  },

  /**
   * "Make it rain" - the current player is guaranteed to win all remaining tricks.
   * This mutation plays out all remaining cards instantly, with the player winning every trick.
   */
  makeItRain: (params: { game: Game; player: Player; card: Card }) => {
    const { game, player, card } = params

    // Get or create the current trick
    let currentTrick = last(game.round.tricks)
    if (!currentTrick) {
      currentTrick = createTrick({ playedCards: [] })
      game.round.tricks.push(currentTrick)
    }

    // Play the triggering card
    currentTrick.playedCards.push({ player, card })
    player.cards.delete(card)

    // Complete the current trick by having all other players "play" placeholder cards
    // (their actual cards don't matter since the current player wins anyway)
    const playersInTrick = new Set(currentTrick.playedCards.map((pc) => pc.player.id))
    for (const otherPlayer of game.players) {
      if (!playersInTrick.has(otherPlayer.id)) {
        const otherCard = Array.from(otherPlayer.cards)[0]
        if (otherCard) {
          currentTrick.playedCards.push({ player: otherPlayer, card: otherCard })
          otherPlayer.cards.delete(otherCard)
        }
      }
    }

    // Play out remaining tricks - player leads and wins each one
    // Sort player's cards descending so lowest (potentially a 2) is played last for bonus points
    const sortedPlayerCards = Array.from(player.cards).sort((a, b) => b.value - a.value)

    while (game.round.tricks.length < 5) {
      const newTrick = createTrick({ playedCards: [] })
      game.round.tricks.push(newTrick)

      // Player leads with their next highest card
      const playerCard = sortedPlayerCards.shift()
      if (playerCard) {
        newTrick.playedCards.push({ player, card: playerCard })
        player.cards.delete(playerCard)
      }

      // Other players play their cards
      for (const otherPlayer of game.players) {
        if (otherPlayer.id === player.id) continue
        const otherCard = Array.from(otherPlayer.cards)[0]
        if (otherCard) {
          newTrick.playedCards.push({ player: otherPlayer, card: otherCard })
          otherPlayer.cards.delete(otherCard)
        }
      }
    }
  },
}
