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
import { CARDS } from 'game/constants'
import { Game } from 'game/types'

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
      deck: [...CARDS],
      rules: {
        throwScoreThreshold: 45,
        pointsForWin: 5,
        pointsForWinWithTwo: 10,
        numberOfThrows: 3,
        chicagoRequiresBestHand: true,
        chicagoCanBeCalledBeforeFifteen: true,
        oneOpenMode: 'last',
        handPoints: {
          pair: 1,
          twoPair: 2,
          threeOfAKind: 3,
          straight: 4,
          flush: 5,
          fullHouse: 6,
          fourOfAKind: 7,
          straightFlush: 8,
          royalStraightFlush: 52,
        },
      },
      owner,
      dealer: owner,
      currentPlayer: owner,
      phase: 'new' as const,
      name: input.gameName,
      password: input.password,
      round: createRound({}),
      players: [owner],
      events: [],
    } satisfies Omit<Game, 'id'>

    const { game } = storeGame(gameData)

    return {
      playerId: owner.id,
      playerSecret: owner.secret,
      gameId: game.id,
    }
  })
