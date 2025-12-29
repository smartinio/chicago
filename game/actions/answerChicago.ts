import { z } from 'zod'
import { publicProcedure } from '#server/trpc'
import { getGameAsCurrentPlayer } from '#game/store'
import { Errors, isError, Results } from '#shared/types'
import { mutate } from '#game/mutations'
import { getPlayerNextTo } from '#game/utils'
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
        // Validate that player is eligible to call Chicago
        if (!game.rules.chicagoCanBeCalledBeforeFifteen && player.score < 15) {
          return Errors.FORBIDDEN
        }
        mutate.setChicagoCaller({ game, player })
        mutate.addEvent({
          game,
          event: { actor: player, action: 'answered_chicago', accepted: true },
        })
        mutate.setRoundPhase({ game, phase: 'tricking' })
        mutate.addEvent({ game, event: { actor: 'server', action: 'tricking_phase_started' } })
        return Results.STARTED_ROUND
      }

      if (player.id !== game.dealer.id) {
        if (game.rules.chicagoCanBeCalledBeforeFifteen) {
          const nextPlayer = getPlayerNextTo(player, game)
          mutate.setCurrentPlayer({ game, player: nextPlayer })
          return Results.ANSWERED_CHICAGO
        }

        // Find next eligible player between current and dealer (going forward, not wrapping)
        // Asking order is: playerAfterDealer -> ... -> dealer
        // We only look at players we haven't asked yet (between current and dealer inclusive)
        const currentPlayerIndex = game.players.findIndex((p) => p.id === player.id)
        const dealerIndex = game.players.findIndex((p) => p.id === game.dealer.id)

        // Build candidates: players from current+1 to dealer (wrapping if needed)
        const candidates: typeof game.players = []
        let idx = (currentPlayerIndex + 1) % game.players.length
        while (idx !== dealerIndex) {
          candidates.push(game.players[idx])
          idx = (idx + 1) % game.players.length
        }
        // Include the dealer as the last candidate
        candidates.push(game.players[dealerIndex])

        const nextPlayer = candidates.find((p) => p.score >= 15)

        if (nextPlayer) {
          mutate.setCurrentPlayer({ game, player: nextPlayer })
          return Results.ANSWERED_CHICAGO
        }
      }

      mutate.setRoundPhase({ game, phase: 'tricking' })
      mutate.addEvent({ game, event: { actor: 'server', action: 'tricking_phase_started' } })
      mutate.setCurrentPlayer({ game, player: getPlayerNextTo(game.dealer, game) })

      return Results.ANSWERED_CHICAGO
    })()

    updateClients(game)

    return outcome
  })
