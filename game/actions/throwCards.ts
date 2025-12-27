import { publicProcedure } from 'server/trpc'
import { z } from 'zod'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Player, Results } from 'game/types'
import { mutate } from 'game/mutations'
import { schemas } from 'shared/schemas'
import { updateClients } from 'game/emitter'
import { getPlayerNextTo, getPlayersWithBestHand } from 'game/utils'

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

    if (game.phase !== 'round') {
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'throwing') {
      return Errors.INVALID_PHASE
    }

    const { cards } = input

    if (!cards.every((card) => player.cards.has(card))) {
      return Errors.CARD_NOT_IN_HAND
    }

    const count = cards.length

    const moveToNextPhase = () => {
      mutate.setCurrentPlayer({ game, player: getPlayerNextTo(game.dealer, game) })

      if (game.rules.chicagoCanBeCalledBeforeFifteen || game.players.some((p) => p.score >= 15)) {
        mutate.setRoundPhase({ game, phase: 'asking_chicago' })
      } else {
        mutate.setRoundPhase({ game, phase: 'tricking' })
      }
    }

    const outcome = (() => {
      const cycle = mutate.updateThrowCycle({ game, player })
      const isLastThrowInCycle = cycle.every(Boolean)
      const isLastCycle = game.round.throwCycles.length === game.rules.numberOfThrows

      if (count > 0) {
        mutate.throwCards({ game, player, cards })
      }

      mutate.addEvent({ game, event: { actor: player, action: 'threw_cards', count } })

      let nextPlayer

      if (isLastThrowInCycle) {
        if (isLastCycle) {
          moveToNextPhase()
          return Results.THREW_CARDS
        }

        const bestHandPlayers = getPlayersWithBestHand(game)

        for (const { player, points, handType } of bestHandPlayers) {
          mutate.givePoints({ player, points })
          mutate.addEvent({
            game,
            event: { actor: player, action: 'received_points', points, handType },
          })
        }

        mutate.addThrowCycle({ game })
        nextPlayer = mutate.getNextThrowEligiblePlayerAfter({ game, afterPlayer: game.dealer })
      } else {
        nextPlayer = mutate.getNextThrowEligiblePlayerAfter({ game, afterPlayer: player })
      }

      if (!nextPlayer) {
        moveToNextPhase()
      } else {
        mutate.setCurrentPlayer({ game, player: nextPlayer })
      }

      return Results.THREW_CARDS
    })()

    updateClients(game)

    return outcome
  })
