import { z } from 'zod'
import { publicProcedure } from '#server/trpc'
import { getGameAsCurrentPlayer } from '#game/store'
import { Errors, isError, Results } from '#shared/types'
import { mutate } from '#game/mutations'
import { updateClients } from '#game/emitter'
import { handlePostThrow } from './throwCards'
import { logger } from '#game/logger'

export const answerOneOpen = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
      acceptOpen: z.boolean(),
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

    if (game.round.phase !== 'asking_one_open') {
      return Errors.INVALID_PHASE
    }

    if (!game.round.openCard) {
      logger.error('No open card to answer')
      return Errors.UNEXPECTED
    }

    const outcome = (() => {
      const { openCard } = game.round
      mutate.setOpenCard({ game, card: undefined })
      mutate.setRoundPhase({ game, phase: 'throwing' })

      if (input.acceptOpen) {
        mutate.acceptCards({ player, cards: [openCard] })
      } else {
        mutate.returnCards({ game, cards: [openCard] })
        const [card] = mutate.drawCards({ game, count: 1 })
        mutate.acceptCards({ player, cards: [card] })
      }

      mutate.addEvent({
        game,
        event: {
          actor: player,
          action: 'answered_one_open',
          accepted: input.acceptOpen,
          card: openCard,
        },
      })

      const cycle = mutate.updateThrowCycle({ game, player })

      handlePostThrow({ game, player, cycle })

      return Results.ANSWERED_ONE_OPEN
    })()

    updateClients(game)

    return outcome
  })
