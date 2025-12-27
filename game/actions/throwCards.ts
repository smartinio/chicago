import { publicProcedure } from 'server/trpc'
import { z } from 'zod'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, Game, isError, Player, Results } from 'game/types'
import { mutate } from 'game/mutations'
import { schemas } from 'shared/schemas'
import { updateClients } from 'game/emitter'
import { getPlayerNextTo, getPlayersWithBestHand } from 'game/utils'
import { logger } from 'game/logger'

export const throwCards = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
      cards: z.array(schemas.card()).min(0).max(5),
      oneOpen: z.boolean(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsCurrentPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result
    const { cards, oneOpen } = input

    if (game.phase !== 'round') {
      logger.error('Cannot throw cards when game phase is not round')
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'throwing') {
      logger.error('Cannot throw cards when round phase is not throwing')
      return Errors.INVALID_PHASE
    }

    if (
      oneOpen &&
      game.rules.oneOpenMode === 'last' &&
      game.round.throwCycles.length !== game.rules.numberOfThrows
    ) {
      logger.error('Cannot get one open card until the final throw')
      return Errors.FORBIDDEN
    }

    if (oneOpen && cards.length !== 1) {
      logger.error('Cannot get one open card with more than one card')
      return Errors.FORBIDDEN
    }

    if (!cards.every((card) => player.cards.has(card))) {
      return Errors.CARD_NOT_IN_HAND
    }

    const count = cards.length

    const outcome = (() => {
      if (oneOpen) {
        mutate.removeCards({ player, cards })
        mutate.returnCards({ game, cards })
        const [card] = mutate.drawCards({ game, count: 1 })
        mutate.setOpenCard({ game, card })
        mutate.setRoundPhase({ game, phase: 'asking_one_open' })
        return Results.THREW_CARDS
      }

      if (count > 0) {
        mutate.exchangeCards({ game, player, cards })
      }

      mutate.addEvent({ game, event: { actor: player, action: 'threw_cards', count } })

      const cycle = mutate.updateThrowCycle({ game, player })
      handlePostThrow({ game, player, cycle })

      return Results.THREW_CARDS
    })()

    updateClients(game)

    return outcome
  })

export const moveToNextPhase = (params: { game: Game }) => {
  const { game } = params
  mutate.setCurrentPlayer({ game, player: getPlayerNextTo(game.dealer, game) })

  if (game.rules.chicagoCanBeCalledBeforeFifteen || game.players.some((p) => p.score >= 15)) {
    mutate.setRoundPhase({ game, phase: 'asking_chicago' })
  } else {
    mutate.setRoundPhase({ game, phase: 'tricking' })
  }
}

export const handlePostThrow = (params: { game: Game; player: Player; cycle: boolean[] }) => {
  const { game, player, cycle } = params
  const isLastThrowInCycle = cycle.every(Boolean)
  const isLastCycle = game.round.throwCycles.length === game.rules.numberOfThrows

  let nextPlayer

  if (isLastThrowInCycle) {
    if (isLastCycle) {
      moveToNextPhase({ game })
      return Results.THREW_CARDS
    }

    mutate.addThrowCycle({ game })
    const bestHandPlayers = getPlayersWithBestHand(game)

    for (const { player, points, handType } of bestHandPlayers) {
      if (handType === 'fourOfAKind') {
        mutate.setCurrentPlayer({ game, player })
        mutate.setRoundPhase({ game, phase: 'asking_four_of_a_kind' })
        return Results.THREW_CARDS
      }

      mutate.givePoints({ player, points })
      mutate.addEvent({
        game,
        event: { actor: player, action: 'received_points', points, handType },
      })
    }

    nextPlayer = mutate.getNextThrowEligiblePlayerAfter({ game, afterPlayer: game.dealer })
  } else {
    nextPlayer = mutate.getNextThrowEligiblePlayerAfter({ game, afterPlayer: player })
  }

  if (!nextPlayer) {
    moveToNextPhase({ game })
  } else {
    mutate.setCurrentPlayer({ game, player: nextPlayer })
  }
}
