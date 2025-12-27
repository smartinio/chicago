import { z } from 'zod'
import { getGameAsPlayer } from 'game/store'
import { Errors, isError } from 'game/types'
import { publicProcedure } from 'server/trpc'
import { createSnapshot } from 'game/snapshot'
import { observable } from '@trpc/server/observable'
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
  .subscription(({ input }) => {
    return observable<SocketEvent | Errors>((emit) => {
      const result = getGameAsPlayer(input)

      if (isError(result)) {
        return emit.next(result)
      }

      const { game, player } = result

      const snapshot = createSnapshot({ game, player })

      emit.next(snapshot)

      const playerChannel = getPlayerChannel(player)

      return emitter.subscribe(playerChannel, (data) => emit.next(data))
    })
  })
