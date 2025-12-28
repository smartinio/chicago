import { z } from 'zod'
import { publicProcedure } from '#server/trpc'
import { getGameAsCurrentPlayer } from '#game/store'
import { Errors, isError, Results } from '#shared/types'
import { mutate } from '#game/mutations'
import { updateClients } from '#game/emitter'
import * as throwingPhase from './throwCards'
import { decideWinningPlayedCard } from '#game/utils'

export const answerFourOfAKind = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
      answer: z.enum(['points', 'reset_others']),
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

    if (game.round.phase !== 'asking_four_of_a_kind') {
      return Errors.INVALID_PHASE
    }

    const outcome = (() => {
      if (input.answer === 'points') {
        const points = game.rules.handPoints.fourOfAKind
        mutate.givePoints({ player, points })
      } else {
        mutate.resetOthersScore({ game, player })
      }

      mutate.addEvent({
        game,
        event: { actor: player, action: 'answered_four_of_a_kind', answer: input.answer },
      })

      // answering before tricks are played === we were in the throwing phase
      if (game.round.tricks.length === 0) {
        const nextPlayer = mutate.getNextThrowEligiblePlayerAfter({
          game,
          afterPlayer: game.dealer,
        })

        if (nextPlayer) {
          mutate.setCurrentPlayer({ game, player: nextPlayer })
        } else {
          throwingPhase.moveToNextPhase({ game })
        }
      } else {
        // answering after tricks are played === post-game points
        const { winning } = decideWinningPlayedCard({ round: game.round })
        mutate.endRound({ game, roundWinner: winning.player })
        return Results.ROUND_OVER
      }

      return Results.ANSWERED_ONE_OPEN
    })()

    updateClients(game)

    return outcome
  })
