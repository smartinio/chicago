import { z } from 'zod'
import { storeGame } from '#game/store'
import { createPlayer, createRound } from '#game/utils'
import { v4 as uuid } from 'uuid'
import { publicProcedure } from '#server/trpc'
import {
  MAX_GAME_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  MIN_GAME_NAME_LENGTH,
  MIN_PLAYER_NAME_LENGTH,
} from '#shared/constants'
import { CARDS } from '#game/constants'
import { Game } from '#game/types'

const rulesSchema = z.object({
  throwScoreThreshold: z.number().min(42).max(46).optional(),
  pointsForWin: z.number().min(2).max(5).optional(),
  pointsForWinWithTwo: z.number().min(5).max(10).optional(),
  numberOfThrows: z.number().min(2).max(3).optional(),
  chicagoRequiresBestHand: z.boolean().optional(),
  chicagoCanBeCalledBeforeFifteen: z.boolean().optional(),
  oneOpenMode: z.enum(['all', 'last']).optional(),
})

export type RulesInput = z.infer<typeof rulesSchema>

export const createNewGame = publicProcedure
  .input(
    z.object({
      gameName: z.string().min(MIN_GAME_NAME_LENGTH).max(MAX_GAME_NAME_LENGTH),
      playerName: z.string().min(MIN_PLAYER_NAME_LENGTH).max(MAX_PLAYER_NAME_LENGTH),
      password: z.string().optional(),
      rules: rulesSchema.optional(),
    })
  )
  .mutation(({ input }) => {
    const owner = createPlayer({
      id: uuid(),
      secret: uuid(),
      name: input.playerName,
    })

    const defaultRules = {
      throwScoreThreshold: 45,
      pointsForWin: 5,
      pointsForWinWithTwo: 10,
      numberOfThrows: 3,
      chicagoRequiresBestHand: true,
      chicagoCanBeCalledBeforeFifteen: true,
      oneOpenMode: 'last' as const,
      handPoints: {
        highCard: 0,
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
    }

    const gameData = {
      deck: [...CARDS],
      rules: {
        ...defaultRules,
        ...input.rules,
        handPoints: defaultRules.handPoints, // handPoints is not configurable
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
