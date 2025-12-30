import { z } from 'zod'
import { getGameAsCurrentPlayer } from '#game/store'
import { Card, Errors, Game, isError, Player, Results, Suit } from '#game/types'
import { decideWinningPlayedCard, getPlayerNextTo, getPlayersWithBestHand } from '#game/utils'
import { last } from '#utils/last'
import { mutate } from '#game/mutations'
import { schemas } from '#shared/schemas'
import { publicProcedure } from '#server/trpc'
import { updateClients } from '#game/emitter'
import { logger } from '#game/logger'
import { CARDS } from '#game/constants'

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
      logger.error('Cannot trick when game phase is', game.phase)
      return Errors.INVALID_PHASE
    }

    if (game.round.phase !== 'tricking') {
      logger.error('Cannot trick when round phase is', game.round.phase)
      return Errors.INVALID_PHASE
    }

    if (!player.cards.has(card)) {
      logger.error('Cannot play card not on hand')
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
        logger.error('Player which can follow suit must do so')
        return Errors.MUST_FOLLOW_SUIT
      }
    }

    const outcome = (() => {
      const makesItRain = !otherPlayersCanWinRound(game, player, card)

      if (makesItRain) {
        const cards = mutate.makeItRain({ game, player, card })
        mutate.addEvent({ game, event: { actor: player, action: 'made_it_rain', cards } })
      } else {
        mutate.playCard({ trick, player, card })
        mutate.addEvent({ game, event: { actor: player, action: 'played_card', card } })
      }

      const { chicagoCaller } = game.round
      const { winning } = decideWinningPlayedCard({ round: game.round })

      // Check if Chicago caller lost a trick (either normally or via someone else making it rain)
      if (chicagoCaller) {
        const chicagoKilled = makesItRain
          ? player.id !== chicagoCaller.id // Someone else made it rain - Chicago is killed
          : winning.player.id !== chicagoCaller.id // Someone else won the trick normally

        if (chicagoKilled) {
          const roundWinner = makesItRain ? player : winning.player
          mutate.givePoints({ player: chicagoCaller, points: -15 })
          mutate.addEvent({
            game,
            event: { actor: chicagoCaller, action: 'lost_chicago', points: -15 },
          })
          mutate.endRound({ game, roundWinner })

          return Results.ROUND_OVER
        }
      }

      const trickIsOver = trick.playedCards.length === game.players.length
      const isLastTrick = game.round.tricks.length === 5

      // If makeItRain, the player who made it rain wins all remaining tricks
      const actualWinner = makesItRain ? player : winning.player

      let nextTricker = getPlayerNextTo(player, game)

      if (trickIsOver) {
        if (!makesItRain) {
          mutate.addEvent({ game, event: { actor: winning.player, action: 'won_trick' } })
        }
        nextTricker = actualWinner

        if (isLastTrick) {
          if (chicagoCaller) {
            const bestHandPlayers = getPlayersWithBestHand(game)
            const callerHasBestHand =
              !game.rules.chicagoRequiresBestHand ||
              bestHandPlayers.some((p) => p.player.id === chicagoCaller.id)

            if (callerHasBestHand) {
              mutate.givePoints({ player: chicagoCaller, points: 15 })
              mutate.setTakenChicago({ player: chicagoCaller })
              mutate.addEvent({
                game,
                event: { actor: chicagoCaller, action: 'won_round', points: 15 },
              })
            } else {
              // Chicago caller won all tricks but doesn't have best hand - they fail
              mutate.givePoints({ player: chicagoCaller, points: -15 })

              for (const { player, cards, handType } of bestHandPlayers) {
                mutate.addEvent({
                  game,
                  event: {
                    actor: player,
                    action: 'had_hand_type',
                    handType,
                    cards,
                  },
                })
              }

              mutate.addEvent({
                game,
                event: { actor: chicagoCaller, action: 'lost_chicago', points: -15 },
              })
            }
          } else {
            // For last trick points, use the actual winning card (not affected by makeItRain)
            const lastTrickWinningCard = winning.card
            const points =
              lastTrickWinningCard.value === 2
                ? game.rules.pointsForWinWithTwo
                : game.rules.pointsForWin

            mutate.givePoints({ player: actualWinner, points })
            mutate.addEvent({ game, event: { actor: actualWinner, action: 'won_round', points } })

            const bestHandPlayers = getPlayersWithBestHand(game)

            for (const { player, points, handType } of bestHandPlayers) {
              if (handType === 'fourOfAKind') {
                mutate.setCurrentPlayer({ game, player })
                mutate.setRoundPhase({ game, phase: 'asking_four_of_a_kind' })
                return Results.PLAYED_TRICK
              }

              if (points > 0) {
                mutate.givePoints({ player, points })
                mutate.addEvent({
                  game,
                  event: { actor: player, action: 'received_points', points, handType },
                })
              }
            }
          }
          mutate.endRound({ game, roundWinner: actualWinner })
          return Results.ROUND_OVER
        }

        mutate.addTrick({ game })
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

const SUITS: Suit[] = ['spades', 'clubs', 'hearts', 'diamonds']

/** Returns false (make it rain) when current player is guaranteed to win all remaining tricks. */
const otherPlayersCanWinRound = (game: Game, player: Player, card: Card): boolean => {
  const dominated = (card: Card, maxByOpponent: number) => card.value > maxByOpponent

  // Build game state
  const { voids, maxBySuit } = buildPublicKnowledge(game, player)
  const remaining = Array.from(player.cards).filter((c) => c.id !== card.id)
  const currentTrick = last(game.round.tricks)
  const tricksPlayed = game.round.tricks.filter((t) => t.playedCards.length === game.players.length)
  const tricksRemaining = 4 - tricksPlayed.length // 5 total, minus completed, minus current

  // Check if a card is unbeatable: highest remaining OR all opponents void in suit
  const isUnbeatable = (c: Card) => voids.allVoidIn(c.suit) || dominated(c, maxBySuit[c.suit])

  // Last trick: just check if current card wins
  if (tricksRemaining <= 0) {
    if (!currentTrick?.playedCards.length) {
      // Leading last trick
      return !isUnbeatable(card)
    }
    // Following in last trick
    const leadSuit = currentTrick.playedCards[0].card.suit
    const bestPlayed = Math.max(
      ...currentTrick.playedCards.map((pc) => (pc.card.suit === leadSuit ? pc.card.value : 0))
    )
    if (card.suit !== leadSuit || card.value <= bestPlayed) return true

    // If player is last to play in the last trick, just win normally (no make it rain)
    const isLastToPlay = currentTrick.playedCards.length === game.players.length - 1
    if (isLastToPlay) return true

    const playedIds = new Set(currentTrick.playedCards.map((pc) => pc.player.id))
    const canBeat = game.players.some(
      (p) =>
        p.id !== player.id &&
        !playedIds.has(p.id) &&
        !voids.isVoid(p.id, leadSuit) &&
        maxBySuit[leadSuit] > card.value
    )
    return canBeat
  }

  // If following in current trick, check if we can win it first
  if (currentTrick?.playedCards.length) {
    const leadSuit = currentTrick.playedCards[0].card.suit
    const bestPlayed = Math.max(
      ...currentTrick.playedCards.map((pc) => (pc.card.suit === leadSuit ? pc.card.value : 0))
    )
    // If we can't follow suit or can't beat the best card, we can't make it rain
    if (card.suit !== leadSuit || card.value <= bestPlayed) return true

    // Check if any player yet to play can beat our card
    const playedIds = new Set(currentTrick.playedCards.map((pc) => pc.player.id))
    const canBeat = game.players.some(
      (p) =>
        p.id !== player.id &&
        !playedIds.has(p.id) &&
        !voids.isVoid(p.id, leadSuit) &&
        maxBySuit[leadSuit] > card.value
    )
    if (canBeat) return true
  } else {
    // Leading: check if the card we're playing is beatable
    if (!isUnbeatable(card)) return true
  }

  // Multiple tricks: count guaranteed wins from remaining cards
  const wins = SUITS.reduce((count, suit) => {
    const cards = remaining.filter((c) => c.suit === suit).sort((a, b) => b.value - a.value)
    if (voids.allVoidIn(suit)) return count + cards.length
    const max = maxBySuit[suit]
    return count + cards.filter((c) => c.value > max).length
  }, 0)

  return wins < tricksRemaining
}

/** Extracts publicly known information: who is void in which suits, and max opponent card per suit. */
const buildPublicKnowledge = (game: Game, player: Player) => {
  const opponents = game.players.filter((p) => p.id !== player.id)
  const voidSets = new Map(opponents.map((p) => [p.id, new Set<Suit>()]))

  // Track voids from failed suit-follows
  for (const trick of game.round.tricks) {
    if (!trick.playedCards.length) continue
    const leadSuit = trick.playedCards[0].card.suit
    for (const { player: p, card } of trick.playedCards) {
      if (p.id !== player.id && card.suit !== leadSuit) {
        voidSets.get(p.id)!.add(leadSuit)
      }
    }
  }

  // Compute max unaccounted card per suit (what opponents might have)
  const played = new Set(game.round.tricks.flatMap((t) => t.playedCards.map((pc) => pc.card.id)))
  const owned = new Set(Array.from(player.cards).map((c) => c.id))
  const unaccounted = CARDS.filter((c) => !played.has(c.id) && !owned.has(c.id))

  const maxBySuit = Object.fromEntries(
    SUITS.map((s) => [
      s,
      Math.max(0, ...unaccounted.filter((c) => c.suit === s).map((c) => c.value)),
    ])
  ) as Record<Suit, number>

  return {
    voids: {
      isVoid: (id: string, suit: Suit) => voidSets.get(id)?.has(suit) ?? false,
      allVoidIn: (suit: Suit) => opponents.every((p) => voidSets.get(p.id)!.has(suit)),
    },
    maxBySuit,
  }
}
