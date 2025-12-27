import { z } from 'zod'
import { getGameAsPlayer } from 'game/store'
import { Errors, isError } from 'game/types'
import { publicProcedure } from 'server/trpc'
import { createSnapshot } from 'game/snapshot'
import { emitter, getPlayerChannel, SocketEvent } from 'game/emitter'

export const snapshotQuery = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerId: z.string(),
      playerSecret: z.string(),
    })
  )
  .query(({ input }) => {
    const result = getGameAsPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result

    return createSnapshot({ game, player })
  })

export const snapshotSubscription = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerId: z.string(),
      playerSecret: z.string(),
    })
  )
  .subscription(async function* ({ input, signal }): AsyncGenerator<SocketEvent | Errors> {
    const result = getGameAsPlayer(input)

    if (isError(result)) {
      yield result
      return
    }

    const { game, player } = result

    // Emit initial snapshot
    yield createSnapshot({ game, player })

    const playerChannel = getPlayerChannel(player)

    // Listen for updates using async iterator
    for await (const [data] of emitter.iterate(playerChannel, signal)) {
      yield data
    }
  })
