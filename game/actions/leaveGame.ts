import { z } from 'zod'
import { mutate } from 'game/mutations'
import { getGameAsPlayer } from 'game/store'
import { isError, Results } from 'game/types'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'

export const leaveGame = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result

    const outcome = (() => {
      const result = mutate.removePlayer({ game, player })

      if (result) {
        return result
      }

      mutate.addEvent({ game, event: { actor: player, action: 'left_game' } })

      if (game.phase === 'round' && !['over', 'killed'].includes(game.round.phase)) {
        mutate.addEvent({ game, event: { actor: 'server', action: 'killed_round' } })
        mutate.setRoundPhase({ game, phase: 'killed' })
        return Results.ROUND_OVER
      }

      return Results.LEFT_GAME
    })()

    if (!isError(outcome)) {
      updateClients(game)
    }

    return outcome
  })
