import { z } from 'zod'
import { publicProcedure } from '#server/trpc'
import { getGameAsCurrentPlayer } from '#game/store'
import { Errors, isError, Results } from '#shared/types'
import { mutate } from '#game/mutations'
import { getPlayerNextTo, getPlayersWithBestHand } from '#game/utils'
import { updateClients } from '#game/emitter'

export const answerChicago = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      playerSecret: z.string(),
      takeChicago: z.boolean(),
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

    if (game.round.phase !== 'asking_chicago') {
      return Errors.INVALID_PHASE
    }

    const outcome = (() => {
      if (input.takeChicago) {
        // Check if caller has the best hand (for chicagoRequiresBestHand rule)
        const bestHandPlayers = getPlayersWithBestHand(game)

        mutate.setChicagoCaller({ game, player, bestHandPlayers })
        mutate.addEvent({
          game,
          event: { actor: player, action: 'answered_chicago', accepted: true },
        })
        mutate.setRoundPhase({ game, phase: 'tricking' })
        return Results.STARTED_ROUND
      }

      if (player.id !== game.dealer.id) {
        if (game.rules.chicagoCanBeCalledBeforeFifteen) {
          const nextPlayer = getPlayerNextTo(player, game)
          mutate.setCurrentPlayer({ game, player: nextPlayer })
          return Results.ANSWERED_CHICAGO
        }

        const currentPlayerIndex = game.players.findIndex((p) => p.id === player.id)
        const candidates = game.players
          .slice(currentPlayerIndex + 1)
          .concat(game.players.slice(0, currentPlayerIndex))

        const nextPlayer = candidates.find((p) => p.score >= 15)

        if (nextPlayer) {
          mutate.setCurrentPlayer({ game, player: nextPlayer })
          return Results.ANSWERED_CHICAGO
        }
      }

      mutate.setRoundPhase({ game, phase: 'tricking' })
      mutate.setCurrentPlayer({ game, player: getPlayerNextTo(game.dealer, game) })

      return Results.ANSWERED_CHICAGO
    })()

    updateClients(game)

    return outcome
  })
