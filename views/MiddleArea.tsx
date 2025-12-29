import { usePlayerGame, useSnapshot } from '#store'
import { Card } from '#shared/types'
import { MiddleAreaContent } from './MiddleAreaContent'

export const MiddleArea = () => {
  const { snapshot } = useSnapshot()

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
      playerCount={players.length}
    />
  )
}
