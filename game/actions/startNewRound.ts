import { z } from 'zod'
import { MIN_PLAYER_COUNT } from '#game/constants'
import { mutate } from '#game/mutations'
import { getGameAsDealer } from '#game/store'
import { Errors, isError, Player, Results, RoundPhase } from '#game/types'
import { createRound, getPlayerNextTo } from '#game/utils'
import { publicProcedure } from '#server/trpc'
import { updateClients } from '#game/emitter'

export const startNewRound = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      dealerSecret: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsDealer(input)

    if (isError(result)) {
      return result
    }

    const { game, dealer } = result

    if (game.players.length < MIN_PLAYER_COUNT) {
      return Errors.TOO_FEW_PLAYERS
    }

    if (game.round.phase !== 'over' && game.round.phase !== 'killed' && game.phase !== 'new') {
      return Errors.INVALID_PHASE
    }

    const outcome = (() => {
      const isReset = game.phase === 'over'

      if (isReset) {
        mutate.resetGame({ game })
      }

      const isRestart = game.round.phase === 'killed'

      const throwEligiblePlayer = mutate.getNextThrowEligiblePlayerAfter({
        game,
        afterPlayer: dealer,
      })

      let phase: RoundPhase
      let nextPlayer: Player

      if (throwEligiblePlayer) {
        phase = 'throwing'
        nextPlayer = throwEligiblePlayer
      } else if (game.rules.chicagoCanBeCalledBeforeFifteen) {
        phase = 'asking_chicago'
        nextPlayer = getPlayerNextTo(dealer, game)
      } else {
        // Find first eligible player (score >= 15) starting from player after dealer
        const dealerIndex = game.players.findIndex((p) => p.id === dealer.id)
        const orderedPlayers = game.players
          .slice(dealerIndex + 1)
          .concat(game.players.slice(0, dealerIndex + 1))
        const firstEligible = orderedPlayers.find((p) => p.score >= 15)

        if (firstEligible) {
          phase = 'asking_chicago'
          nextPlayer = firstEligible
        } else {
          phase = 'tricking'
          nextPlayer = getPlayerNextTo(dealer, game)
        }
      }

      const newRound = createRound({
        phase,
        throwCycles: [game.players.map(() => false)],
      })

      mutate.newRound({ game, round: newRound })
      mutate.setCurrentPlayer({ game, player: nextPlayer })
      mutate.addEvent({
        game,
        event: { actor: dealer, action: isRestart ? 'restarted_round' : 'started_round' },
      })
      mutate.addEvent({
        game,
        event: {
          actor: 'server',
          action: 'throw_cycle_started',
          throwNumber: game.round.throwCycles.length,
          maxThrows: game.rules.numberOfThrows,
        },
      })

      return Results.STARTED_ROUND
    })()

    updateClients(game)

    return outcome
  })
