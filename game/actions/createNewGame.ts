import { z } from 'zod'
import { storeGame } from 'game/store'
import { createPlayer, createRound } from 'game/utils'
import { v4 as uuid } from 'uuid'
import { publicProcedure } from 'server/trpc'
import {
  MAX_GAME_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  MIN_GAME_NAME_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
} from 'shared/constants'

export const createNewGame = publicProcedure
  .input(
    z.object({
      gameName: z.string().min(MIN_GAME_NAME_LENGTH).max(MAX_GAME_NAME_LENGTH),
      playerName: z.string().min(MIN_PLAYER_NAME_LENGTH).max(MAX_PLAYER_NAME_LENGTH),
      password: z.string().optional(),
    })
  )
  .mutation(({ input }) => {
    const owner = createPlayer({
      id: uuid(),
      secret: uuid(),
      name: input.playerName,
    })

    const gameData = {
      owner,
      dealer: owner,
      phase: 'new' as const,
      name: input.gameName,
      password: input.password,
      round: createRound({
        currentPlayer: owner,
      }),
      players: [owner],
      events: [],
    }

    const { game } = storeGame(gameData)

    return {
      playerId: owner.id,
      playerSecret: owner.secret,
      gameId: game.id,
    }
  })
