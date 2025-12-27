import { v4 as uuid } from 'uuid'
import { z } from 'zod'
import { MAX_PLAYER_COUNT } from 'game/constants'
import { mutate } from 'game/mutations'
import { getGameAsOutsider } from 'game/store'
import { Errors, isError } from 'game/types'
import { createPlayer } from 'game/utils'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'
import { MIN_PLAYER_NAME_LENGTH, MAX_PLAYER_NAME_LENGTH } from 'shared/constants'

export const joinGame = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      password: z.string().optional(),
      playerName: z.string().min(MIN_PLAYER_NAME_LENGTH).max(MAX_PLAYER_NAME_LENGTH),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsOutsider(input)

    if (isError(result)) {
      return result
    }

    const { game } = result
    const { playerName } = input

    if (game.phase === 'round') {
      return Errors.INVALID_PHASE
    }

    if (game.players.length === MAX_PLAYER_COUNT) {
      return Errors.TOO_MANY_PLAYERS
    }

    if (game.players.some((existingPlayer) => existingPlayer.name === playerName)) {
      return Errors.NAME_ALREADY_TAKEN
    }

    const outcome = (() => {
      const player = createPlayer({
        id: uuid(),
        secret: uuid(),
        name: playerName,
      })

      mutate.addPlayer({ game, player })

      return { player }
    })()

    updateClients(game)

    return {
      playerId: outcome.player.id,
      playerSecret: outcome.player.secret,
      gameId: game.id,
    }
  })
