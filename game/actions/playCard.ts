import { z } from 'zod'
import { getGameAsCurrentPlayer } from 'game/store'
import { Errors, isError, Player, Results, Suit } from 'game/types'
import { decideWinningPlayedCard, getPlayerNextTo, getPlayersWithBestHand } from 'game/utils'
import { last } from 'utils/last'
import { mutate } from 'game/mutations'
import { schemas } from 'shared/schemas'
import { publicProcedure } from 'server/trpc'
import { updateClients } from 'game/emitter'

export const playCard = publicProcedure
  .input(
    z.object({
      gameId: z.string(),
      card: schemas.card(),
      playerSecret: z.string(),
    })
  )
  .mutation(({ input }) => {
    const result = getGameAsCurrentPlayer(input)

    if (isError(result)) {
      return result
    }

    const { game, player } = result
    const { card } = input

    if (game.phase !== 'round') {
      console.error('Cannot trick when game phase is', game.phase)
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'tricking') {
      console.error('Cannot trick when round phase is', game.round.phase)
      return Errors.INVALID_PHASE
    }

    if (!player.cards.has(card)) {
      console.error('Cannot play card not on hand')
      return Errors.FORBIDDEN
    }

    let trick = last(game.round.tricks)

    if (!trick) {
      trick = mutate.addTrick({ game })
    }

    const [starter] = trick.playedCards

    if (starter) {
      const followsSuit = card.suit === starter.card.suit
      const canFollowSuit = canPlayerFollowSuit({ player, suit: starter.card.suit })

      if (canFollowSuit && !followsSuit) {
        console.error('Player which can follow suit must do so')
        return Errors.FORBIDDEN
      }
    }

    const outcome = (() => {
      mutate.playCard({ trick, player, card })
      mutate.addEvent({ game, event: { actor: player, action: 'played_card', card } })

      const { chicagoCaller } = game.round
      const { winning } = decideWinningPlayedCard({ round: game.round })

      if (chicagoCaller) {
        if (winning.player.id !== chicagoCaller.id) {
          mutate.givePoints({ player: chicagoCaller, points: -15 })
          mutate.addEvent({ game, event: { actor: chicagoCaller, action: 'lost_round' } })
          mutate.endRound({ game })

          return Results.ROUND_OVER
        }
      }

      const trickIsOver = trick.playedCards.length === game.players.length
      const isLastTrick = game.round.tricks.length === 5

      let nextTricker = getPlayerNextTo(player, game)

      if (trickIsOver) {
        mutate.addEvent({ game, event: { actor: winning.player, action: 'won_trick' } })
        nextTricker = winning.player

        if (isLastTrick) {
          if (chicagoCaller) {
            mutate.givePoints({ player: chicagoCaller, points: 15 })
            mutate.setTakenChicago({ player: chicagoCaller })
            mutate.addEvent({ game, event: { actor: chicagoCaller, action: 'won_round' } })
          } else {
            const points =
              winning.card.value === 2 ? game.rules.pointsForWinWithTwo : game.rules.pointsForWin

            mutate.givePoints({ player: winning.player, points })
            mutate.addEvent({ game, event: { actor: winning.player, action: 'won_round' } })

            const bestHandPlayers = getPlayersWithBestHand(game)

            for (const { player, points, handType } of bestHandPlayers) {
              mutate.givePoints({ player, points })
              mutate.addEvent({
                game,
                event: { actor: player, action: 'received_points', points, handType },
              })
            }
          }
          mutate.endRound({ game })
          return Results.ROUND_OVER
        }
      }

      mutate.setCurrentPlayer({ game, player: nextTricker })

      return Results.PLAYED_TRICK
    })()

    updateClients(game)

    return outcome
  })

const canPlayerFollowSuit = (params: { player: Player; suit: Suit }) => {
  return Array.from(params.player.cards).some((card) => card.suit === params.suit)
}
