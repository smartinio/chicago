import { getGameAsPlayer } from 'game/store'
import { isError } from 'game/types'
import { publicProcedure } from 'server/trpc'
import { z } from 'zod'

export const keepAlive = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
    })
  )
  .query(({ input }) => {
    const result = getGameAsPlayer(input)

    if (isError(result)) {
      return result
    }

    return 'pong'
  })
