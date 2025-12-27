import { z } from 'zod'
import { mutate } from 'game/mutations'
import { getGameAsOwner, getGameAsPlayer } from 'game/store'
import { Errors, isError, Results } from 'game/types'
import { publicProcedure } from 'server/trpc'
import { notifyKickedPlayer, updateClients } from 'game/emitter'

export const kickPlayer = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      ownerSecret: z.string(),
      playerIdToKick: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsOwner(input)

    if (isError(result)) {
      return result
    }

    const { game, owner } = result

    const player = game.players.find((p) => p.id === input.playerIdToKick)

    if (!player) {
      return Errors.PLAYER_NOT_FOUND
    }

    const outcome = (() => {
      const result = mutate.removePlayer({ game, player })

      if (result) {
        return result
      }

      mutate.addEvent({ game, event: { actor: owner, action: 'kicked_player', player } })

      if (game.phase === 'round' && !['over', 'killed'].includes(game.round.phase)) {
        mutate.addEvent({ game, event: { actor: 'server', action: 'killed_round' } })
        mutate.setRoundPhase({ game, phase: 'killed' })
        return Results.ROUND_OVER
      }

      return Results.KICKED_PLAYER
    })()

    if (!isError(outcome)) {
      notifyKickedPlayer(player)
      updateClients(game)
    }

    return outcome
  })
