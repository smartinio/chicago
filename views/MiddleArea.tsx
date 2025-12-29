import { usePlayerGame, useSnapshot } from '#store'
import { defaultDataHandler } from '#utils/data'
import { trpc } from '#utils/trpc'
import { Card } from '#shared/types'
import { MiddleAreaContent } from './MiddleAreaContent'

export const MiddleArea = () => {
  const { snapshot } = useSnapshot()
  const { gameId, playerSecret } = usePlayerGame()
  const mutationOptions = { onSuccess: defaultDataHandler }
  const startNewRoundMutation = trpc.startNewRound.useMutation(mutationOptions)
  const answerChicagoMutation = trpc.answerChicago.useMutation(mutationOptions)
  const answerOneOpenMutation = trpc.answerOneOpen.useMutation(mutationOptions)
  const answerFourOfAKindMutation = trpc.answerFourOfAKind.useMutation(mutationOptions)

  if (!snapshot) {
    return null
  }

  const {
    gamePhase,
    roundPhase,
    openCard,
    canStart,
    dealerId,
    currentPlayerId,
    isMyTurn,
    players,
    rules,
  } = snapshot

  const dealer = players.find((p) => p.id === dealerId)
  const currentPlayer = players.find((p) => p.id === currentPlayerId)

  // Find the four of a kind cards from the current player's played cards
  const getFourOfAKindCards = (): Card[] => {
    if (!currentPlayer) return []
    const cards = currentPlayer.playedCards
    const valueCounts = new Map<number, Card[]>()

    for (const card of cards) {
      const existing = valueCounts.get(card.value) || []
      valueCounts.set(card.value, [...existing, card])
    }

    for (const cards of Array.from(valueCounts.values())) {
      if (cards.length >= 4) {
        return cards.slice(0, 4)
      }
    }
    return []
  }

  return (
    <MiddleAreaContent
      gamePhase={gamePhase}
      roundPhase={roundPhase}
      isMyTurn={isMyTurn}
      canStart={canStart}
      dealerName={dealer?.name}
      currentPlayerName={currentPlayer?.name}
      openCard={openCard}
      fourOfAKindCards={getFourOfAKindCards()}
      fourOfAKindPoints={rules.handPoints.fourOfAKind}
      playerCount={players.length}
      onStartNewRound={() => startNewRoundMutation.mutate({ gameId, dealerSecret: playerSecret })}
      onAcceptChicago={() =>
        answerChicagoMutation.mutate({ gameId, playerSecret, takeChicago: true })
      }
      onRejectChicago={() =>
        answerChicagoMutation.mutate({ gameId, playerSecret, takeChicago: false })
      }
      onAcceptOneOpen={() =>
        answerOneOpenMutation.mutate({ gameId, playerSecret, acceptOpen: true })
      }
      onRejectOneOpen={() =>
        answerOneOpenMutation.mutate({ gameId, playerSecret, acceptOpen: false })
      }
      onFourOfAKindPoints={() =>
        answerFourOfAKindMutation.mutate({ gameId, playerSecret, answer: 'points' })
      }
      onFourOfAKindZeroOthers={() =>
        answerFourOfAKindMutation.mutate({ gameId, playerSecret, answer: 'reset_others' })
      }
    />
  )
}
